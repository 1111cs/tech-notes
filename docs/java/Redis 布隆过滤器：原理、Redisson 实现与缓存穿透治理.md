# Redis 布隆过滤器：原理、Redisson 实现与缓存穿透治理

## 一、为什么需要布隆过滤器？

在 Java 后端开发中，缓存穿透是一个比较常见的问题。

假设我们有一个优惠券模板查询接口，正常情况下，用户查询优惠券模板时，系统会先从 Redis 中获取缓存，如果缓存不存在，再查询 MySQL。

但是，如果有人不断请求一些根本不存在的优惠券模板 ID，例如：

```
999999
888888
777777
666666
```

这些请求在 Redis 中都无法命中缓存，随后又会不断访问 MySQL。

如果这种请求数量很大，就可能给数据库带来大量无效查询压力。

这种现象称为**缓存穿透（Cache Penetration）**。

对于缓存穿透，我们通常可以采用以下几种治理手段：

1. 参数校验：对明显非法的请求直接拒绝。
2. 空值缓存：数据库查询不到记录时，也将空结果缓存一段时间。
3. 布隆过滤器：在查询数据库之前，提前判断某个数据是否可能存在。

其中，布隆过滤器是一种比较有代表性的概率型数据结构，能够以较小的内存开销，帮助系统过滤大量不存在的数据请求。

## 二、布隆过滤器的基本原理

### 1. 什么是布隆过滤器？

布隆过滤器（Bloom Filter）是一种空间效率较高的概率型数据结构，主要用于判断一个元素是否可能存在于某个集合中。

它的核心由两部分组成：

- 一个长度固定的位数组（Bit Array）。
- 多个哈希函数（Hash Functions）。

假设我们要将优惠券模板 ID `1001` 添加到布隆过滤器中，系统会通过多个哈希函数计算出几个位置，然后将对应位置设置为 1。

例如：

```
初始位数组：

位置：  0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15
数值：  0 0 0 0 0 0 0 0 0 0  0  0  0  0  0  0
```

假设经过三个哈希函数计算，得到的位置分别是 2、7、12，那么添加元素之后：

```
添加 1001：

位置：  0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15
数值：  0 0 1 0 0 0 0 1 0 0  0  0  1  0  0  0
```

当我们再次查询 `1001` 时，系统使用相同的哈希函数计算出这三个位置。

如果对应位置全部为 1，就认为这个元素可能存在。

如果其中任何一个位置为 0，就可以确定这个元素不存在。

### 2. 为什么布隆过滤器可能误判？

假设我们又添加了一个元素 `1002`。

它经过哈希计算后，可能也会将某些位置设置为 1。

随着元素不断增加，位数组中会有越来越多的位置变成 1。

此时，一个实际上没有添加过的元素 `9999`，经过哈希计算后，可能恰好对应的几个位置也全部为 1。

于是布隆过滤器会认为它可能存在。

这就是布隆过滤器的误判（False Positive）。

布隆过滤器有两个非常重要的特点：

| 判断结果              | 实际含义                                     |
| --------------------- | -------------------------------------------- |
| 不存在（返回 false）  | 一定不存在，前提是过滤器正确初始化并完整维护 |
| 可能存在（返回 true） | 可能存在，也可能是误判，需要进一步验证       |

因此，布隆过滤器并不能代替数据库查询，它只是一个前置过滤机制。

需要特别注意：标准布隆过滤器在正确添加数据、没有错误删除或维护问题的情况下，不会出现假阴性。但如果业务系统漏掉了数据添加，就可能出现本来存在的数据被判断为不存在的情况。

### 3. 布隆过滤器的误判率

布隆过滤器的误判率可以通过初始化参数进行控制。

例如：

```
bloomFilter.tryInit(640L, 0.001);
```

其中：

- `640L`：预计插入的元素数量。
- `0.001`：期望误判率，即 0.1%。

误判率越低，通常需要越大的位数组和更多的哈希计算。

布隆过滤器的理论位数组长度可以通过以下公式估算：

[
m=-\frac{n\ln p}{(\ln 2)^2}
]

其中：

- (m)：位数组长度。
- (n)：预计插入的元素数量。
- (p)：期望误判率。

哈希函数的理论最优数量为：

[
k=\frac{m}{n}\ln 2
]

以 640 个元素、0.001 的误判率为例，理论上大约需要 9205 个 Bit，也就是约 1.15 KB 的位数组空间，以及约 10 个哈希函数。

实际 Redisson 的内存占用还会受到数据结构实现和 Redis 存储开销的影响。

另外，640 只是预计插入数量，并不是严格的容量上限。如果实际插入数量远远超过预期，误判率就会逐渐上升。

## 三、Redisson 如何使用布隆过滤器？

在实际 Java 项目中，我们通常不会自己实现位数组和哈希函数，而是使用 Redisson 提供的 `RBloomFilter`。

Redisson 将 Redis 中的布隆过滤器封装成了 Java API，使开发者能够像使用普通 Java 对象一样完成初始化、添加和查询操作。

### 1. 获取布隆过滤器对象

```
RBloomFilter<String> bloomFilter =
        redissonClient.getBloomFilter(
                "couponTemplateQueryBloomFilter"
        );
```

这里涉及两个重要的 API。

`**RedissonClient**`**：** Redisson 提供的客户端入口，用于访问 Redis 中的各种数据结构和分布式对象。

`**getBloomFilter()**`**：** 根据指定名称获取一个布隆过滤器对象。

这里需要注意，调用 `getBloomFilter()` 并不意味着已经创建并初始化了布隆过滤器，它只是获取一个对应的 Java 操作对象。

真正的初始化需要调用 `tryInit()`。

### 2. 初始化布隆过滤器

```
bloomFilter.tryInit(640L, 0.001);
```

`tryInit()` 接收两个参数：

| 参数               | 含义             |
| ------------------ | ---------------- |
| expectedInsertions | 预计插入元素数量 |
| falseProbability   | 期望误判率       |

这里的 `tryInit()` 具有一定的幂等初始化特征：

- 返回 `true`：本次调用完成了初始化。
- 返回 `false`：对应的过滤器已经初始化，本次没有重新初始化。

因此，在 Spring Boot 项目中，可以将它放在配置类中统一管理，而不需要每次业务查询时重新初始化。

特别注意：如果过滤器已经存在，即使当前代码传入了不同的容量和误判率，`tryInit()` 也不会自动修改原有配置。

### 3. 添加元素

```
bloomFilter.add("1001");
```

表示将优惠券模板 ID `1001` 添加到布隆过滤器。

添加之后，Redisson 会通过对应的哈希计算，将位数组中对应的位置设置为 1。

需要注意，布隆过滤器不能像普通 Set 一样直接删除其中的某个元素。标准布隆过滤器不支持安全的单元素删除，因为多个元素可能共享同一个 Bit 位。

### 4. 判断元素是否存在

```
boolean exists = bloomFilter.contains("1001");
```

`contains()` 用于判断某个元素是否可能存在于布隆过滤器中。

返回 `false`：可以确定该元素不存在。

返回 `true`：该元素可能存在，也可能是误判，需要继续查询数据库或其他可信数据源进行确认。

## 四、Spring Boot 如何集成 Redisson 布隆过滤器？

在实际项目中，我们通常通过 Spring Bean 的方式统一管理布隆过滤器。

oneCoupon 项目中的配置代码如下：

```
@Configuration
public class RBloomFilterConfiguration {

    /**
     * 优惠券查询缓存穿透布隆过滤器
     */
    @Bean
    public RBloomFilter<String> couponTemplateQueryBloomFilter(
            RedissonClient redissonClient,
            @Value("${framework.cache.redis.prefix:}")
            String cachePrefix) {

        RBloomFilter<String> bloomFilter =
                redissonClient.getBloomFilter(
                        cachePrefix + "couponTemplateQueryBloomFilter"
                );

        bloomFilter.tryInit(640L, 0.001);

        return bloomFilter;
    }
}
```

这里涉及几个 Spring Boot 知识点。

### 1. @Configuration

`@Configuration` 表示这是一个配置类，Spring 会对其中定义的配置进行处理。

通常我们会将一些需要统一初始化的组件放在配置类中，例如 Redis 客户端、线程池、布隆过滤器等。

### 2. @Bean

```
@Bean
public RBloomFilter<String> couponTemplateQueryBloomFilter(...) {
    // ...
    return bloomFilter;
}
```

`@Bean` 表示将方法返回的对象注册到 Spring 容器中。

因此，其他 Spring Bean 可以通过依赖注入直接使用这个布隆过滤器，而不需要每次重新获取和初始化。

### 3. @Value

```
@Value("${framework.cache.redis.prefix:}")
String cachePrefix
```

这里通过 `@Value` 读取配置文件中的 Redis Key 前缀。

`${framework.cache.redis.prefix:}` 中冒号后面为空字符串，表示如果配置不存在，就使用空字符串作为默认值。

这样可以方便地为不同环境设置不同的 Key 前缀，减少不同环境之间的 Redis Key 冲突。

### 4. 构造器注入

在业务 Service 中：

```
@RequiredArgsConstructor
@Service
public class CouponTemplateServiceImpl {

    private final RBloomFilter<String>
            couponTemplateQueryBloomFilter;

}
```

这里使用 Lombok 的 `@RequiredArgsConstructor`，为 `final` 字段生成构造方法。

Spring 根据 Bean 类型完成依赖注入。

因此，业务代码可以直接调用：

```
couponTemplateQueryBloomFilter.add("1001");

couponTemplateQueryBloomFilter.contains("1001");
```

## 五、结合 oneCoupon：布隆过滤器的完整工程实践

理解了基本原理和 Java API 之后，我们回到 oneCoupon 项目，看看布隆过滤器究竟是如何参与优惠券模板查询的。

这里涉及两个业务模块：

- `merchant-admin`：商家后台，负责创建优惠券模板。
- `engine`：用户端业务模块，负责查询优惠券模板。

两个模块通过 Redis 中的同一个布隆过滤器共享数据。

### 1. 创建优惠券模板：将 ID 添加到布隆过滤器

在 merchant-admin 的 `createCouponTemplate()` 方法中，作者首先将优惠券模板写入 MySQL。

```
CouponTemplateDO couponTemplateDO =
        BeanUtil.toBean(
                requestParam,
                CouponTemplateDO.class
        );

couponTemplateDO.setStatus(
        CouponTemplateStatusEnum.ACTIVE.getStatus()
);

couponTemplateDO.setShopNumber(
        UserContext.getShopNumber()
);

couponTemplateMapper.insert(couponTemplateDO);
```

这里通过 MyBatis Mapper 将优惠券模板持久化到数据库。

由于模板 ID 是数据库插入时生成的，所以插入完成后，才能拿到实际的模板 ID。

接下来，作者执行缓存预热，将优惠券模板的信息提前写入 Redis Hash。

随后，通过 Lua 脚本将 Hash 字段和过期时间一起写入 Redis。这部分在前面的《Spring Data Redis 常用操作》中已经介绍过，这里不再重复展开。

真正值得关注的是最后这几行：

```
// 添加优惠券模板 ID 到布隆过滤器
String strCouponTemplateId =
        String.valueOf(couponTemplateDO.getId());

couponTemplateQueryBloomFilter.add(strCouponTemplateId);
```

这里先将数据库生成的 Long 类型模板 ID 转换成 String，再调用 `add()` 添加到布隆过滤器。

为什么要转换成 String？

因为项目中使用的是：

```
RBloomFilter<String>
```

所以写入和查询时都需要保持相同的元素类型及表示形式。

### 2. 用户查询优惠券模板：通过布隆过滤器过滤无效请求

在 engine 模块中，用户查询优惠券模板时，会先检查正常缓存。

```
Map<Object, Object> couponTemplateCacheMap =
        stringRedisTemplate.opsForHash()
                .entries(couponTemplateCacheKey);
```

如果缓存命中，就直接返回，不需要执行后面的布隆过滤器判断。

如果缓存未命中，则进入下一步：

```
if (MapUtil.isEmpty(couponTemplateCacheMap)) {

    if (!couponTemplateQueryBloomFilter.contains(
            requestParam.getCouponTemplateId())) {

        throw new ClientException("优惠券模板不存在");
    }

    // 继续检查空值缓存
    // 获取分布式锁
    // 双重检查
    // 必要时查询 MySQL
}
```

这里的核心逻辑是：

如果布隆过滤器判断模板 ID 不存在，就直接返回错误，不再访问数据库。

如果判断可能存在，则继续执行后续查询流程。

### 3. 两个模块如何共享同一个布隆过滤器？

这是一个很值得理解的工程设计。

merchant-admin 和 engine 分别运行在不同的 Spring Boot 应用中，各自拥有独立的 JVM。

它们并没有共享同一个 Java 对象，而是分别通过：

```
redissonClient.getBloomFilter(
        cachePrefix + "couponTemplateQueryBloomFilter"
);
```

获取对应的布隆过滤器操作对象。

只要两个模块满足以下条件：

1. 连接到同一个 Redis 服务及相同的数据环境。
2. 使用相同的 Redis Key 前缀。
3. 使用相同的布隆过滤器名称。
4. 使用兼容的过滤器配置。

那么它们操作的就是 Redis 中同一个分布式布隆过滤器。

最终形成：

```
merchant-admin
      |
      | add(templateId)
      v
Redis 中的共享布隆过滤器
      ^
      | contains(templateId)
      |
    engine
```

这和 Redisson 分布式锁的设计思路非常相似：

- `RLock`：多个 JVM 操作同一把分布式锁。
- `RBloomFilter`：多个 JVM 操作同一个分布式布隆过滤器。

Redisson 提供 Java API，Redis 负责跨应用实例共享数据。

## 六、为什么 oneCoupon 选择缓存优先、布隆过滤器兜底？

这里还有一个值得理解的设计问题。

之前我们看到，oneCoupon 的查询顺序是：

```
查询正常 Redis 缓存
       |
       v
缓存是否命中？
       |
   +---+---+
   |       |
  是       否
   |       |
直接返回   布隆过滤器判断
           |
           v
       空值缓存检查
           |
           v
       分布式锁
           |
           v
       双重检查
           |
           v
       查询 MySQL
```

为什么不把布隆过滤器放在正常缓存之前？

因为正常缓存命中时，系统已经获得了完整的优惠券模板信息，没有必要再执行一次布隆过滤器判断。

而 oneCoupon 使用的是 Redisson 的分布式布隆过滤器，它本身也需要访问 Redis。

如果把布隆过滤器放在正常缓存之前，那么每一次正常查询都需要先访问布隆过滤器，再访问正常缓存，增加了一次 Redis 操作。

因此，作者采用了缓存优先的策略：

- 正常请求：优先读取缓存，尽可能快速返回。
- 缓存未命中：再通过布隆过滤器过滤确定不存在的 ID。
- 可能存在：继续通过空值缓存、分布式锁等机制保护数据库。

这是一种根据业务访问特点安排查询顺序的设计。

## 七、源码审查：布隆过滤器的数据初始化与一致性问题

前面我们已经找到了布隆过滤器的创建入口、写入入口和查询入口。

但一个工程组件是否可靠，不能只看它能不能正常调用，还需要考虑它的数据从哪里来、如何维护，以及数据丢失后能否恢复。

通过对 oneCoupon 当前 main 分支源码的排查，我们发现了两个值得关注的问题。

### 1. 当前项目没有发现历史数据批量初始化逻辑

先回顾布隆过滤器的初始化代码：

```
bloomFilter.tryInit(640L, 0.001);
```

这只是初始化布隆过滤器的数据结构及参数，并不会自动从 MySQL 中读取历史优惠券模板 ID。

我们检查了当前 main 分支，没有发现以下历史数据初始化方式：

- 启动时分页查询历史模板。
- 使用 `CommandLineRunner` 或 `ApplicationRunner` 初始化。
- 使用 `@PostConstruct` 初始化。
- 使用 XXL-Job 定时重建。
- 批量调用 `add()` 或 `addAll()`。

目前找到的唯一写入位置，是 merchant-admin 的 `createCouponTemplate()` 方法：

```
String strCouponTemplateId =
        String.valueOf(couponTemplateDO.getId());

couponTemplateQueryBloomFilter.add(strCouponTemplateId);
```

也就是说，**当前源码中布隆过滤器主要依靠新增优惠券模板时进行增量维护。**

这会带来一个潜在问题。

假设数据库中已经存在历史模板 `1001`，但是 Redis 中的布隆过滤器刚刚创建，或者原有过滤器数据已经丢失：

```
MySQL：
存在模板 1001

BloomFilter：
没有添加模板 1001
```

此时 engine 执行：

```
if (!couponTemplateQueryBloomFilter.contains("1001")) {
    throw new ClientException("优惠券模板不存在");
}
```

布隆过滤器会返回 `false`，系统直接拒绝请求，不再查询 MySQL。

明明数据库中存在模板，却无法正常查询。

这不是布隆过滤器算法本身出现了误判，而是业务系统没有正确维护过滤器数据，导致出现了人为制造的假阴性问题。

尤其需要注意，Redis 数据丢失不一定意味着整个 Redis 服务重启。如果配置了 RDB 或 AOF，数据可能正常恢复。这里真正需要关注的是布隆过滤器对应的数据结构不存在、被清空或者未进行历史数据初始化的情况。

### 2. 两个模块的布隆过滤器配置保持一致

我们还检查了 merchant-admin 和 engine 两个模块的配置。

merchant-admin：

```
RBloomFilter<String> bloomFilter =
        redissonClient.getBloomFilter(
                cachePrefix + "couponTemplateQueryBloomFilter"
        );

bloomFilter.tryInit(640L, 0.001);
```

engine：

```
RBloomFilter<String> bloomFilter =
        redissonClient.getBloomFilter(
                cachePrefix + "couponTemplateQueryBloomFilter"
        );

bloomFilter.tryInit(640L, 0.001);
```

逐项对比：

| 配置项          | merchant-admin                     | engine   | 是否一致 |
| --------------- | ---------------------------------- | -------- | -------- |
| Bean 名称       | couponTemplateQueryBloomFilter     | 相同     | 是       |
| Redis 对象名称  | couponTemplateQueryBloomFilter     | 相同     | 是       |
| Key 前缀        | `${framework.cache.redis.prefix:}` | 相同     | 是       |
| 预计插入量      | 640L                               | 640L     | 是       |
| 误判率          | 0.001                              | 0.001    | 是       |
| 默认 Redis 地址 | 同一实例                           | 同一实例 | 是       |

当前配置文件没有显式设置 `framework.cache.redis.prefix`，因此两个模块默认使用空字符串。

只要两个服务连接同一个 Redis 服务、相同的数据环境，并使用相同的过滤器名称，它们操作的就是同一个 Redis 布隆过滤器。

需要特别区分：

两个服务分别创建了自己的 Java `RBloomFilter` Bean，但并不意味着 Redis 中创建了两份布隆过滤器。

真正决定它们是否共享数据的是 Redis 连接环境和底层对象名称，而不是 Spring Bean 的名称。

### 3. tryInit() 不会自动修改已有过滤器的参数

还有一个容易忽略的细节：

```
boolean initialized =
        bloomFilter.tryInit(640L, 0.001);
```

`tryInit()` 的返回值表示本次调用是否完成了初始化：

- `true`：本次调用成功完成初始化。
- `false`：对应的过滤器已经初始化，本次没有重新初始化。

假设 merchant-admin 修改为：

```
bloomFilter.tryInit(10000L, 0.0001);
```

但 engine 仍然使用：

```
bloomFilter.tryInit(640L, 0.001);
```

如果 Redis 中原来的布隆过滤器已经存在，后续调用不会自动按照新的参数重建原有结构。

这意味着两个模块的初始化配置需要统一管理，不能只看各自的 Java 配置是否相同，还要关注 Redis 中实际存在的过滤器配置。

在实际项目中，可以进一步检查 `tryInit()` 的返回值，并通过 `getConfig()` 等接口核对实际配置，避免配置变更后出现认知偏差。

### 4. 如果让我们完善这个设计，应该怎么做？

针对上述问题，我认为至少需要补充两个机制。

**第一：历史数据初始化与重建机制。**

例如，独立设计一个初始化任务，分页查询 MySQL 中需要纳入过滤范围的优惠券模板 ID，再批量添加到布隆过滤器。

示意代码：

```
List<CouponTemplateDO> templates =
        couponTemplateMapper.selectPage(...);

for (CouponTemplateDO template : templates) {
    couponTemplateQueryBloomFilter.add(
            String.valueOf(template.getId())
    );
}
```

实际实现时，应当使用分页查询，而不是一次性将所有历史数据加载到 JVM 内存中。

如果过滤器发生丢失，还需要提供重新构建能力，并确保在初始化完成前，不会让依赖该过滤器的查询流程错误地将历史数据全部拒绝。

**第二：增量数据可靠维护机制。**

创建优惠券模板时：

```
couponTemplateMapper.insert(couponTemplateDO);

couponTemplateQueryBloomFilter.add(
        String.valueOf(couponTemplateDO.getId())
);
```

虽然代码很简单，但这里涉及 MySQL 与 Redis 两个独立数据系统。

假设数据库插入成功，但应用在执行 `add()` 之前发生异常，就可能出现数据库有记录、布隆过滤器没有记录的情况。

因此，生产环境可以考虑：

1. 使用事务 Outbox 或可靠消息机制，将数据库写入与后续布隆过滤器更新衔接起来。
2. 对添加失败的情况设计重试和补偿机制。
3. 定期从数据库读取模板 ID，校验布隆过滤器数据。
4. 对过滤器丢失或重建失败的情况提供恢复流程。

需要注意，普通数据库事务不能天然保证 MySQL 和 Redis 两个系统之间的原子一致性。

另外，普通布隆过滤器不支持安全地删除单个元素。优惠券模板过期或失效后，可以保留 ID 在布隆过滤器中，让它通过前置过滤，再由 MySQL 根据模板状态、有效期和商家归属进行最终判断。

## 八、总结

布隆过滤器是一种空间效率较高的概率型数据结构，主要用于判断某个元素是否可能存在于集合中。

它通过位数组和多个哈希函数实现快速判断，允许一定概率的误判，但在正确维护的情况下不会产生假阴性。

在 Java 后端开发中，我们可以通过 Redisson 提供的 `RBloomFilter` 使用布隆过滤器，并结合 Spring Boot 的 `@Configuration`、`@Bean` 和构造器注入，将其封装成可复用的工程组件。

通过 oneCoupon 项目的实践，我们可以看到布隆过滤器并不是孤立使用的：

- merchant-admin 在创建优惠券模板后，将模板 ID 添加到布隆过滤器。
- engine 在查询模板时，先检查正常缓存，缓存未命中后再通过布隆过滤器过滤无效请求。
- 对于可能存在的模板 ID，继续结合空值缓存、Redisson 分布式锁和双重检查，保护数据库。

整个设计体现了一个重要的工程思想：

**缓存负责提高正常请求的访问效率，布隆过滤器负责过滤确定不存在的数据，空值缓存负责减少重复无效查询，分布式锁负责控制并发回源。不同机制各司其职，共同构建缓存治理体系。**

而通过进一步阅读源码，我们还发现了一个更重要的工程问题：组件能够正常运行，并不代表它的数据一定完整、可靠。初始化、增量维护、异常补偿和数据恢复，同样是分布式组件设计中不可忽视的部分。

学习布隆过滤器，真正需要掌握的不只是 `add()` 和 `contains()` 两个 API，还要理解数据从哪里来、如何维护，以及当数据库和布隆过滤器出现不一致时，系统会发生什么问题。

### 参考资料

1. [Redis 官方文档](https://redis.io/docs/latest/)
2. [Redisson 官方文档](https://redisson.org/docs/)
3. [Redisson RBloomFilter 源码](https://github.com/redisson/redisson/blob/master/redisson/src/main/java/org/redisson/RedissonBloomFilter.java)
4. [Bloom Filter - Wikipedia](https://en.wikipedia.org/wiki/Bloom_filter)