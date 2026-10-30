# Redis 分布式锁：从 SET NX EX 到 Redisson RLock

## 一、为什么需要分布式锁？

在 Java 开发中，我们经常使用 `synchronized` 或 `ReentrantLock` 控制多线程对共享资源的访问，避免多个线程同时修改数据，造成并发问题。

例如：

```
public synchronized void updateStock() {
    // 修改库存
}
```

这类锁主要解决的是同一个 JVM 进程内部的线程竞争问题。

但在实际的企业级应用中，一个 Java 服务往往会部署多个实例。例如，为了提高系统的并发处理能力，我们可能部署三个 Spring Boot 实例：

```
                  Nginx
                    |
          +---------+---------+
          |         |         |
       实例 A     实例 B     实例 C
       JVM 1     JVM 2     JVM 3
          |         |         |
          +---------+---------+
                    |
                 MySQL
```

这三个实例拥有各自独立的 JVM 内存，因此各自的 `synchronized` 锁无法自动协调其他实例中的线程。

假设三个实例同时收到一个请求，都需要重建同一个优惠券模板的缓存，那么它们可能同时查询 MySQL、同时构建缓存。

此时，单机锁已经无法满足需求。

我们需要一种能够被多个应用实例共同访问和协调的锁机制，这就是**分布式锁**。

分布式锁的核心思想是：将锁的状态保存在多个应用实例都能访问的共享资源中，让不同实例通过竞争同一把锁，实现跨进程的互斥访问。

Redis 是实现分布式锁的一种常见方案。

## 二、Redis 为什么能够实现分布式锁？

### 1. Redis 提供共享的存储空间

Redis 通常作为一个独立的中间件运行，不论是同一台机器上的多个 JVM，还是部署在不同服务器上的应用实例，都可以连接同一个 Redis 服务。

例如：

```
       Spring Boot 实例 A
                |
       Spring Boot 实例 B
                |
       Spring Boot 实例 C
                |
                v
          Redis Server
                |
       lock:coupon:1001
```

三个应用实例都可以访问 Redis 中的 `lock:coupon:1001`。

因此，锁的状态不再保存在某个 JVM 的内存中，而是保存在多个实例共享的 Redis 中。

### 2. Redis 的原子操作保证锁竞争的互斥性

Redis 的核心命令执行具有串行化语义。多个客户端同时执行普通命令时，Redis 会按照执行顺序处理它们。

我们可以利用这一特性，通过 `SET NX EX` 命令实现最基本的分布式锁。

```
SET lock:coupon:1001 unique-token NX EX 30
```

这条命令包含三个部分：

| 参数  | 含义                        |
| ----- | --------------------------- |
| SET   | 设置 Key 的值               |
| NX    | 只有 Key 不存在时才设置成功 |
| EX 30 | 设置 30 秒过期时间          |

假设三个应用实例同时竞争这把锁：

```
实例 A：SET lock:coupon:1001 token-A NX EX 30
实例 B：SET lock:coupon:1001 token-B NX EX 30
实例 C：SET lock:coupon:1001 token-C NX EX 30
```

Redis 依次处理这些命令。

1. 实例 A 首先执行，发现 Key 不存在，于是创建锁记录，返回 OK。
2. 实例 B 执行时，发现 Key 已经存在，设置失败。
3. 实例 C 执行时，同样发现 Key 已经存在，设置失败。

最终只有实例 A 成功获得锁。

这里最关键的是：`SET`、`NX` 和 `EX` 被组合成一条 Redis 命令，判断 Key 是否存在、设置锁记录和设置过期时间作为一个原子操作完成，不会出现先判断、再设置时被其他请求插入的竞态问题。

因此，Redis 提供的原子操作就成为实现分布式锁的基础。

**需要注意，Redis 并不是因为所有操作都由单线程执行才天然具有分布式锁能力，而是因为它能够提供满足互斥要求的原子操作。**

### 3. 为什么还需要设置过期时间？

假设实例 A 成功获取锁后，突然发生宕机：

```
实例 A 获取锁成功
       |
       v
Redis 中存在 lock:coupon:1001
       |
       v
实例 A 突然宕机
       |
       v
没有机会主动释放锁
```

如果锁一直存在，其他实例就可能永远无法获得锁，形成死锁。

因此，使用 `EX 30` 设置过期时间，能够让锁在一定时间后自动释放。

不过，固定过期时间也有风险：如果业务执行时间超过 30 秒，锁已经过期，但原来的业务线程可能还在执行。其他实例此时就可能获得同一把锁，造成两个线程同时操作共享资源。

因此，实际工程中的分布式锁还需要考虑锁续期、锁释放和持有者身份校验等问题。

## 三、为什么需要 Redisson？

虽然我们可以通过 `SET NX EX` 实现基本的分布式锁，但如果每次都自己编写锁的获取、释放和续期逻辑，会增加开发成本，也容易出现并发安全问题。

例如：

- 如何判断当前线程是否已经持有锁？
- 如何实现可重入？
- 获取锁失败后如何等待？
- 如何避免错误释放其他线程持有的锁？
- 如果业务执行时间超过预设时间，如何续期？
- 锁释放后，如何通知其他等待者？

Redisson 就是为此提供了更高级的 Redis Java 客户端能力。

它不仅封装了 Redis 的基本数据结构，还提供了分布式锁、阻塞队列、延迟队列等功能。

其中，`RLock` 就是 Redisson 提供的分布式可重入锁。

## 四、Redisson 的分布式锁 API

先看实际项目中的代码：

```
RLock lock = redissonClient.getLock(
        String.format(
                EngineRedisConstant.LOCK_COUPON_TEMPLATE_KEY,
                requestParam.getCouponTemplateId()
        )
);

lock.lock();

try {
    // 执行业务逻辑
} finally {
    lock.unlock();
}
```

这段代码看起来很简单，但涉及几个重要的 API。

### 1. RedissonClient：Redisson 的客户端入口

```
private final RedissonClient redissonClient;
```

`RedissonClient` 是 Redisson 提供的客户端接口，可以理解为 Java 应用访问 Redis 的入口。

在 Spring Boot 项目中，通常通过配置文件配置 Redis 连接信息，再通过 Redisson 自动配置或自定义配置创建客户端 Bean，最后通过构造器注入业务类。

例如：

```java
@RequiredArgsConstructor
@Service
public class CouponTemplateServiceImpl {

    private final RedissonClient redissonClient;

}
```

这里使用 Lombok 的 `@RequiredArgsConstructor`，为 `final` 字段生成构造方法，Spring 通过构造器完成依赖注入。

因此，我们不需要在业务代码中手动创建 Redisson 客户端，就可以直接使用它。

### 2. getLock()：获取分布式锁对象

```
RLock lock = redissonClient.getLock("my-lock");
```

这里的 `getLock()` 用于根据锁名称获取一个 `RLock` 对象。

需要注意：**调用** `**getLock()**` **并不意味着已经成功获取锁。**

它只是获取一个代表 Redis 分布式锁的 Java 操作对象，真正的锁竞争发生在调用 `lock()` 或 `tryLock()` 时。

锁名称非常重要，因为它决定了不同请求是否在竞争同一把锁。

例如：

```
redissonClient.getLock("coupon:1001");
redissonClient.getLock("coupon:1002");
```

这两把锁对应不同的 Redis Key，因此不同优惠券模板的缓存重建可以并行执行。

而多个实例如果都使用 `coupon:1001`，就会竞争同一把逻辑锁。

### 3. lock()：阻塞式获取锁

```
lock.lock();
```

调用 `lock()` 后，当前线程会尝试获取锁。

如果锁没有被其他线程持有，就可以直接获取成功；如果已经被其他线程持有，当前线程通常会等待，直到能够获得锁。

这里的等待并不意味着一直向 Redis 发送请求进行高频轮询。

Redisson 的常规 `RLock` 实现会结合 Redis Pub/Sub 发布订阅机制：竞争失败的线程订阅锁对应的通知频道，在锁释放时收到通知，再重新尝试获取锁。必要时也会根据锁的剩余有效时间进行等待和再次尝试。

因此，Redisson 不只是简单地封装了一条 `SET NX EX` 命令，而是实现了更完整的锁竞争与等待机制。

### 4. tryLock()：尝试获取锁

除了 `lock()`，Redisson 还提供了 `tryLock()`。

```
boolean success = lock.tryLock();

if (success) {
    try {
        // 执行业务逻辑
    } finally {
        lock.unlock();
    }
}
```

两者的主要区别：

- `lock()`：如果获取不到锁，通常会持续等待。
- `tryLock()`：尝试获取锁，如果当前无法获取，则返回 `false`。

还可以指定等待时间和锁的租约时间：

```
boolean success = lock.tryLock(
        5,
        10,
        TimeUnit.SECONDS
);
```

这里：

- 第一个参数 `5`：最多等待 5 秒获取锁。
- 第二个参数 `10`：获取锁后，10 秒后自动释放。

如果在 5 秒内获取不到锁，返回 `false`。

需要特别区分：显式指定 `leaseTime` 后，锁会在指定时间后自动释放，不再依赖默认的看门狗续期机制。因此，租约时间应当结合业务执行时间谨慎设置。

### 5. unlock()：释放锁

```
lock.unlock();
```

业务执行完成后，需要释放锁，让其他等待的线程有机会获得锁。

这里不能简单地执行：

```
DEL lock:coupon:1001
```

因为可能出现以下情况：

1. 实例 A 获取锁。
2. A 的锁到期。
3. 实例 B 成功获取同一把锁。
4. 实例 A 恢复执行，并尝试释放锁。

如果 A 直接删除 Key，就可能误删 B 持有的锁。

因此，Redisson 在释放锁时会校验持有者身份，并结合重入计数判断是否应该真正删除锁。

如果当前线程并不是锁的持有者，调用 `unlock()` 会抛出 `IllegalMonitorStateException`。

这**也是为什么通常将 `unlock()` 放在 `finally` 中，保证业务代码正常结束或抛出异常时，都能执行释放操作。**

## 五、Redisson 的 RLock 有什么特别之处？

相比于自己使用 `SET NX EX` 实现的简单锁，Redisson 的 `RLock` 还提供了几个重要能力。

### 1. 可重入性

可重入锁意味着同一个线程可以多次获得同一把锁，而不会因为自己已经持有锁而发生死锁。

例如：

```java
public void methodA() {
    lock.lock();

    try {
        methodB();
    } finally {
        lock.unlock();
    }
}

public void methodB() {
    lock.lock();

    try {
        // 执行业务逻辑
    } finally {
        lock.unlock();
    }
}
```

如果 `methodA()` 和 `methodB()` 使用的是同一把锁，并且由同一个线程执行，那么第二次获取锁时不会被自己阻塞，而是增加重入计数。

对应地，释放锁时会减少重入计数。

只有当重入计数归零时，锁才真正释放。

### 2. 看门狗机制（Watchdog）

前面提到，分布式锁需要设置过期时间，避免应用宕机后锁一直无法释放。

但固定租约时间也存在问题：业务执行时间可能超过预期。

例如：

```
实例 A 获取锁
       |
       v
业务执行需要 40 秒
       |
       v
原定锁有效期只有 30 秒
       |
       v
锁提前过期，其他实例可能获得锁
```

Redisson 为此提供了看门狗机制。

当使用：

```
lock.lock();
```

且没有显式指定租约时间时，Redisson 会在锁持有期间定期延长锁的过期时间。

默认看门狗超时时间通常为 30 秒，可以通过 `Config.lockWatchdogTimeout` 配置。

只要持锁客户端仍然正常运行，且对应线程仍持有锁，看门狗就会持续续期。

当业务执行完成并释放锁后，续期也会停止。

这样可以降低业务执行时间超过预设租约时间而导致锁提前释放的风险。

注意：看门狗不能保证所有故障场景下的互斥。例如，长时间 JVM 停顿或 Redis 故障切换仍可能带来风险。因此，涉及严格业务一致性的场景，还需要结合数据库约束、幂等性或 fencing token 等机制设计。

## 六、结合 oneCoupon：理解分布式锁如何解决缓存击穿

现在回到我们一直在研究的优惠券模板查询方法。

```
RLock lock = redissonClient.getLock(
        String.format(
                EngineRedisConstant.LOCK_COUPON_TEMPLATE_KEY,
                requestParam.getCouponTemplateId()
        )
);

lock.lock();

try {
    // 双重检查空值缓存
    hasKeyFlag =
            stringRedisTemplate.hasKey(
                    couponTemplateIsNullCacheKey
            );

    if (hasKeyFlag) {
        throw new ClientException("优惠券模板不存在");
    }

    // 双重检查正常缓存
    couponTemplateCacheMap =
            stringRedisTemplate.opsForHash()
                    .entries(couponTemplateCacheKey);

    if (MapUtil.isEmpty(couponTemplateCacheMap)) {
        // 查询 MySQL
        // 写入正常缓存或空值缓存
    }

} finally {
    lock.unlock();
}
```

这里的分布式锁主要用于解决缓存击穿问题。

假设优惠券模板 `1001` 是一个热门模板，其缓存突然过期，同时有大量请求到来。

如果没有锁，多个请求可能同时发现缓存不存在，然后全部查询 MySQL，造成数据库压力。

使用分布式锁后：

1. 多个请求同时发现正常缓存不存在。
2. 它们竞争 `lock:template:1001`。
3. 只有一个请求成功获取锁，负责查询数据库和重建缓存。
4. 其他请求等待。
5. 第一个请求完成缓存重建并释放锁。
6. 后续请求获取锁后，再次检查缓存，发现已经存在，就不需要重复查询数据库。

这里还有一个重要设计：**为什么获取锁后还要再次检查缓存？**

因为请求在等待锁的过程中，其他线程可能已经完成了缓存重建。

如果不进行第二次检查，即使缓存已经存在，后续请求仍可能再次查询数据库，导致重复工作。

因此，双重检查与分布式锁需要配合使用。

这就是 oneCoupon 中缓存击穿治理的基本思路。

## 七、使用分布式锁还需要注意什么？

### 1. 分布式锁不等于业务幂等

锁主要用于控制并发访问，并不能自动保证业务操作只执行一次。

例如，用户重复提交优惠券领取请求，即使两次请求没有同时执行，也可能先后成功执行。

因此，业务还需要结合唯一请求 ID、数据库唯一索引、状态校验等机制实现幂等性。

### 2. 分布式锁不代表绝对安全

Redisson 可以帮助我们管理锁的获取、续期和释放，但 Redis 主从异步复制、故障切换等场景仍可能影响锁的互斥保证。

对于普通缓存重建，这类方案通常具有较好的实用性；对于资金扣减、库存最终一致性等关键业务，不能仅依赖分布式锁，还需要数据库条件更新、唯一约束、幂等处理等机制。

### 3. 锁的粒度要合理

oneCoupon 使用优惠券模板 ID 作为锁 Key 的一部分：

```
lock:template:1001
lock:template:1002
lock:template:1003
```

这样不同模板之间可以并行处理，只有访问同一个模板的请求才会竞争同一把锁。

这属于按业务资源划分锁粒度，可以减少不必要的并发阻塞。

## 八、总结

Redis 能够实现分布式锁，核心在于它为多个应用实例提供了共享的存储空间，并且提供了具有原子执行语义的操作，例如 `SET NX EX`。

Redisson 则在 Redis 的基础上进一步封装了分布式可重入锁 `RLock`，提供锁竞争、阻塞等待、可重入、持有者校验、自动续期和释放通知等能力。

通过 oneCoupon 项目的实践，我们可以看到分布式锁并不是孤立存在的技术，而是缓存治理的一部分：

- Redis Hash 保存优惠券模板缓存。
- 空值缓存缓解缓存穿透。
- Redisson 分布式锁协调缓存重建。
- 双重检查避免重复查询数据库。
- Lua 脚本保证多步 Redis 操作的原子执行。

**学习分布式锁，真正需要掌握的不只是** `**lock()**` **和** `**unlock()**` **两个方法，而是理解多个应用实例如何围绕共享资源实现并发协调，以及锁在异常、超时和恢复场景下可能出现的问题。**

### 参考资料

1. [Redisson 官方文档：Locks and Synchronizers](https://redisson.org/docs/data-and-services/locks-and-synchronizers/)
2. [Redisson RLock 源码](https://github.com/redisson/redisson/blob/master/redisson/src/main/java/org/redisson/RedissonLock.java)
3. [Redis 官方文档：SET 命令](https://redis.io/docs/latest/commands/set/)
4. [Redis 官方文档：Lua 脚本](https://redis.io/docs/latest/develop/programmability/eval-intro/)