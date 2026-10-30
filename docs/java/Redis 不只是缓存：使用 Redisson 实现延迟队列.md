# Redis 不只是缓存：使用 Redisson 实现延迟队列

## 一、Redis 除了缓存，还能做什么？

在 Java 后端开发中，我们经常使用 Redis 缓存数据库查询结果，以减少数据库访问压力。但 Redis 的能力并不局限于缓存，它还提供了多种数据结构，可以用于实现不同的业务功能。

常见的数据结构及其应用场景如下：

| Redis 数据结构   | 典型应用场景                             |
| ---------------- | ---------------------------------------- |
| String           | 缓存、计数器、简单状态值                 |
| List             | 队列、消息列表                           |
| Set              | 去重、集合运算                           |
| Hash             | 存储对象的多个字段                       |
| ZSET（有序集合） | 排行榜、按分数排序、按时间筛选待执行任务 |

**在 Java 项目中，我们还经常使用 Redisson。**它是一个基于 Redis 的 Java 客户端，不仅提供 Redis 数据结构的操作接口，还封装了分布式锁、阻塞队列、延迟队列等更高级的功能。

例如，Redisson 提供了 `RQueue`、`RBlockingQueue`、`RDelayedQueue`、`RLock` 等 API，使开发者可以通过更符合 Java 编程习惯的接口使用这些能力。

需要注意，这些 API 并不都对应 Redis 原生的数据类型。例如，`RDelayedQueue` 是 Redisson 基于 Redis 的数据结构和内部调度机制实现的延迟队列，**而不是 Redis 原生提供的一种数据类型。**

## 二、什么是延迟队列？

普通队列的核心语义是：消息进入队列后，消费者可以按照队列规则获取消息。

延迟队列则增加了一个时间条件：**消息进入延迟队列后，需要等到指定的延迟时间到达，才会被转移到目标队列，供消费者获取。**

例如，优惠券系统中有一个 Excel 行数统计任务。创建任务时，系统立即提交统计工作，同时安排一条 20 秒后到期的延迟任务。

如果统计工作已经完成，延迟任务到期后只需要检查结果，不必重复统计；如果统计结果仍然为空，则尝试重新执行统计。

这种设计可以用于延迟检查、超时处理和补偿任务等场景。

需要注意，延迟队列只负责延迟投递任务，并不意味着任务一定会成功执行。任务执行失败后的重试、幂等、告警和恢复机制，仍然需要业务系统设计。

## 三、Redisson 如何创建延迟队列？

在 oneCoupon 优惠券项目中，相关代码如下：

```
RBlockingDeque<Object> blockingDeque =
        redissonClient.getBlockingDeque(
                "COUPON_TASK_SEND_NUM_DELAY_QUEUE"
        );

RDelayedQueue<Object> delayedQueue =
        redissonClient.getDelayedQueue(blockingDeque);

delayedQueue.offer(
        delayJsonObject, 20, TimeUnit.SECONDS
);
```

这段代码可以分为三个步骤。

### 1. 获取目标阻塞双端队列

```
RBlockingDeque<Object> blockingDeque =
        redissonClient.getBlockingDeque(
                "COUPON_TASK_SEND_NUM_DELAY_QUEUE"
        );
```

`RBlockingDeque` 是 Redisson 提供的阻塞双端队列接口。

它允许消费者在队列没有元素时等待任务到来。例如：

```
JSONObject task = blockingDeque.take();
```

如果队列为空，调用 `take()` 的线程会阻塞；当有元素可以获取时，线程才继续执行。

### 2. 创建延迟队列

```
RDelayedQueue<Object> delayedQueue =
        redissonClient.getDelayedQueue(blockingDeque);
```

这里将 `blockingDeque` 作为延迟队列的目标队列。

`RDelayedQueue` 负责管理任务的延迟时间，并在任务到期后将其转移到这个目标队列。

因此，两者的职责不同：

- `RDelayedQueue`：管理任务的延迟投递。
- `RBlockingDeque`：**存放已经到期、可以被消费者获取的任务。**

### 3. 投递延迟任务

```
delayedQueue.offer(
        delayJsonObject, 20, TimeUnit.SECONDS
);
```

这表示将任务延迟 20 秒后转移到目标队列。

这里的 `offer()` 并不是让当前 Java 线程休眠 20 秒，而是把延迟任务交给 Redisson 管理。调用方可以继续执行后续业务逻辑。

## 四、Redisson 的延迟队列是如何实现的？

Redis 原生提供 String、List、Set、Hash 和 ZSET 等数据结构，但没有直接提供一个名为“延迟队列”的原生数据类型。

Redisson 3.27.2 中的 `RDelayedQueue` 利用多个 Redis 数据结构和内部调度机制实现延迟投递。结合该版本的源码，可以将其核心结构概括为：

| 内部结构        | 主要作用                               |
| --------------- | -------------------------------------- |
| ZSET            | 根据到期时间对延迟任务排序             |
| LIST            | 暂存延迟任务的内部记录                 |
| Pub/Sub Channel | 在需要时通知调度端更新待处理的到期时间 |
| 目标队列        | 保存已经到期、可以被消费者获取的任务   |

具体的内部 Key 名称和脚本逻辑属于 Redisson 的实现细节，可能随版本变化。

其基本工作流程如下：

1. **投递任务。** 调用 `delayedQueue.offer()`，Redisson 通过内部 Lua 脚本将任务及其到期时间写入相关 Redis 结构。
2. **等待到期。** Redisson 内部的调度机制根据 ZSET 中最早到期的任务安排后续检查，而不是让业务线程一直休眠等待。
3. **转移任务。** 当任务到期后，Redisson 将其从延迟任务结构转移到目标队列，并清理对应的内部记录。
4. **消费任务。** 业务消费者通过 `blockingDeque.take()` 获取到期任务，执行相应的业务逻辑。

因此，延迟队列并不是简单地把消息存入 List，然后让 Redis 自动在 20 秒后弹出。它依赖 ZSET 的时间排序、内部调度以及目标队列之间的协作。

## 五、结合优惠券项目理解实际用途

在 oneCoupon 中，延迟队列承担的是 Excel 行数统计的兜底检查。

整体流程如下：

```
创建优惠券任务
       |
       +--> 线程池异步统计 Excel 行数
       |         |
       |         +--> 统计完成，更新 sendNum
       |
       +--> Redis 延迟队列，20 秒后到期
                  |
                  v
             消费者获取任务
                  |
                  v
             查询数据库 sendNum
                  |
             +----+----+
             |         |
          已有值      仍为 null
             |         |
            跳过     重新统计
```

这套机制体现了线程池与延迟队列的不同职责：

- 线程池负责尽快执行统计任务。
- Redis 延迟队列负责在未来某个时间点触发检查。
- 数据库中的 `sendNum` 用于判断统计结果是否已经产生。

如果线程池没有接收任务、统计工作执行失败，或者执行时间超过预期，延迟消费者就有机会发现统计结果尚未产生，并尝试补救。

**但这种机制只能提供补救机会，不能直接保证任务最终完成。例如，延迟消费者再次统计失败时，如果没有进一步的重试与告警机制，任务仍然可能失败。**

另外，应用重启后的恢复也需要专门考虑。旧版 `RDelayedQueue` 需要在应用恢复后重新初始化对应的延迟队列调度机制，才能继续处理尚未转移的延迟任务。因此，不能仅凭任务已经写入 Redis，就认定应用重启后一定能够自动恢复全部工作。

## 六、延迟队列与可靠消息队列有什么区别？

延迟队列解决的是任务何时可以被投递的问题；可靠消息队列还需要考虑任务被取出后，如果消费者执行失败，如何重试、确认和避免消息丢失。

因此，在选择方案时，需要结合任务的重要程度和可靠性要求。

对于简单的延迟检查、缓存刷新或非关键补偿任务，Redisson 延迟队列可能已经足够。

对于不能轻易丢失的订单处理、支付后续任务等业务，则应进一步考虑持久化任务记录、消息确认、重试、死信处理和幂等机制。

还有一个版本问题：oneCoupon 使用的是 Redisson 3.27.2。在后续 Redisson 3.46.0 中，`RDelayedQueue` 被标记为弃用，**官方引入的 `RReliableQueue` 提供了延迟投递等能力。阅读旧项目时，应先理解其当前实现；开发新系统时，再根据实际依赖版本和可靠性需求选择合适的 API。**

## 七、总结

Redis 不只是缓存，它的多种数据结构也可以用于构建队列、排行榜和任务调度等功能。

Redisson 则进一步将这些底层能力封装成更方便使用的 Java API。通过 `RDelayedQueue` 和 `RBlockingDeque`，开发者可以实现延迟投递与阻塞消费，而不必自己编写完整的延迟调度逻辑。

在实际项目中，需要理解三个层次：

- Redis 提供底层数据结构。
- Redisson 封装延迟投递和队列操作。
- 业务消费者负责获取任务、执行逻辑以及处理失败。

**使用延迟队列，不代表任务执行一定可靠。** 延迟投递、任务消费、失败重试和最终业务一致性是不同的问题，需要分别设计。

### 参考资料

- [Redisson 3.27.2：RedissonDelayedQueue.java 源码](https://github.com/redisson/redisson/blob/redisson-3.27.2/redisson/src/main/java/org/redisson/RedissonDelayedQueue.java)
- [Redisson 3.27.2：RDelayedQueue API](https://github.com/redisson/redisson/blob/redisson-3.27.2/redisson/src/main/java/org/redisson/api/RDelayedQueue.java)
- [Redisson 官方队列文档](https://redisson.pro/docs/data-and-services/queues/)
- [Redisson 官方更新日志](https://github.com/redisson/redisson/blob/master/CHANGELOG.md)