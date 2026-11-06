# Java 并发编程：为什么有了 Thread，还需要单线程线程池？

## 一、从一个实际项目的问题说起

在 Java 开发中，我们可以通过 `Thread` 创建线程，也可以通过 `ThreadPoolExecutor` 创建线程池。

例如，创建一个普通线程：

```
Thread thread = new Thread(() -> {
    System.out.println("执行后台任务");
});

thread.start();
```

也可以通过线程池提交任务：

```
ExecutorService executorService =
        new ThreadPoolExecutor(
                2,
                4,
                60,
                TimeUnit.SECONDS,
                new LinkedBlockingQueue<>()
        );

executorService.execute(() -> {
    System.out.println("执行后台任务");
});
```

前者直接启动线程，后者则将任务交给线程池管理。关于线程池的核心线程数、最大线程数、工作队列和拒绝策略，可以参考上一篇文章《Java 线程与线程池：从 Thread 到 ThreadPoolExecutor》。

不过，在实际项目中，还有一种写法值得关注：

```
Executors.newSingleThreadExecutor()
        .execute(() -> {
            while (true) {
                // 持续处理后台任务
            }
        });
```

这里使用了 `Executors.newSingleThreadExecutor()`，创建一个单线程执行器。

问题来了：既然这里只需要一个工作线程，为什么不直接使用 `new Thread()`？使用单线程线程池究竟有什么额外价值？

## 二、什么是 newSingleThreadExecutor？

`Executors` 是 Java 提供的一个线程池工厂类，其中的 `newSingleThreadExecutor()` 方法可以创建一个单线程执行器。

```
ExecutorService executorService =
        Executors.newSingleThreadExecutor();
```

它返回一个 `ExecutorService`，底层使用单个工作线程串行执行提交的任务。

例如：

```java
ExecutorService executorService =
        Executors.newSingleThreadExecutor();

executorService.execute(() -> {
    System.out.println("任务 A");
});

executorService.execute(() -> {
    System.out.println("任务 B");
});

executorService.execute(() -> {
    System.out.println("任务 C");
});
```

在正常执行且任务没有被取消的情况下，**这三个任务会按照提交顺序，由同一个工作线程依次执行。**

这里需要注意：`newSingleThreadExecutor()` 并不是调用时就一定立即创建工作线程。通常是在提交任务后，执行器才按需创建工作线程。

它的核心特征包括：

1. 同一时间只有一个工作线程执行任务。
2. **多个任务可以排队等待执行。**
3. 任务按照提交顺序串行执行。
4. **如果工作线程异常终止，执行器会尝试创建新的工作线程继续处理后续任务。**
5. 可以通过 `ExecutorService` 提供的接口统一提交任务、关闭执行器。

与 `newFixedThreadPool(1)` 不同，`newSingleThreadExecutor()` 返回的执行器不会通过公开接口允许调用者将工作线程数量调整为其他值。

需要注意，它默认使用无界任务队列。如果生产者提交任务的速度持续超过消费者的处理速度，等待任务可能不断积压，**因此仍然需要考虑内存和任务流量问题。**

## 三、为什么不直接使用 new Thread()？

直接创建线程和使用单线程执行器，最终都可能由一个工作线程执行任务，但它们的抽象层次不同。

### 1. 直接创建线程：适合简单、独立的任务

```
Thread thread = new Thread(() -> {
    System.out.println("执行后台任务");
});

thread.start();
```

这种写法简单直接，适合需要启动一个独立线程的场景。

但是，`Thread` 本身并不提供通用的任务队列，也不负责管理一组待执行任务。如果后续有多个任务需要串行处理，就需要自行实现排队、任务调度和线程生命周期管理。

### 2. 使用单线程执行器：适合持续接收任务的场景

```
ExecutorService executorService =
        Executors.newSingleThreadExecutor();

executorService.execute(taskA);
executorService.execute(taskB);
executorService.execute(taskC);
```

执行器将线程管理和任务提交分开。业务代码只需要提交任务，不**必自行处理工作线程何时创建、多个任务如何串行执行等问题。**

因此，两种写法的主要区别并不是一个创建线程、另一个不创建线程，而是：

- `Thread` 更直接地表示一个线程。
- `ExecutorService` 提供面向任务的执行与生命周期管理接口。

如果业务只需要执行一次简单任务，直接创建线程可能就足够了；如果需要持续接收多个任务、控制执行顺序或统一管理任务生命周期，使用执行器通常更合适。

## 四、结合真实项目：单线程池消费 Redis 队列

在优惠券项目中，作者使用了类似下面的代码：

```java
Executors.newSingleThreadExecutor(
        runnable -> {
            Thread thread = new Thread(runnable);
            thread.setName("delay_coupon-task_send-num_consumer");
            thread.setDaemon(true);
            return thread;
        }
).execute(() -> {
    RBlockingDeque<JSONObject> blockingDeque =
            redissonClient.getBlockingDeque(
                    "COUPON_TASK_SEND_NUM_DELAY_QUEUE"
            );

    for (;;) {
        try {
            JSONObject delayJsonObject = blockingDeque.take();

            if (delayJsonObject != null) {
                // 查询数据库，检查 sendNum 是否已经更新
                // 如果仍未更新，则重新执行统计
            }
        } catch (Throwable ignored) {
        }
    }
});
```

这段代码涉及三个关键点。

### 1. ThreadFactory：自定义工作线程

传入 `newSingleThreadExecutor()` 的 Lambda 表达式负责创建工作线程，也就是 `ThreadFactory`。

```
runnable -> {
    Thread thread = new Thread(runnable);
    thread.setName("delay_coupon-task_send-num_consumer");
    thread.setDaemon(true);
    return thread;
}
```

这里做了三件事：

- 使用 `new Thread(runnable)` 创建线程。
- 设置线程名称，方便通过日志、线程转储等方式定位后台任务。
- 将线程设置为守护线程。

守护线程属于 JVM 的后台线程。当只剩下守护线程时，JVM **不会仅仅为了等待它们结束而继续保持运行。**

### 2. execute()：提交长期运行的消费任务

```
.execute(() -> {
    for (;;) {
        // 持续消费队列
    }
});
```

这里提交的不是一个很快就结束的任务，而是一个长期运行的消费循环。

工作线程启动后，会持续执行这个循环，从 Redis 队列中取出到期任务，再查询数据库，判断是否需要重新统计 Excel 行数。

### 3. take()：阻塞等待队列中的任务

```
JSONObject delayJsonObject = blockingDeque.take();
```

`take()` 会在队列为空时阻塞等待，直到有元素可以取出。

因此，这个消费者不需要反复检查队列是否为空，也不会因为空转而持续消耗 CPU。

## 五、回到核心问题：这个项目为什么不直接创建 Thread？

这是整个分析中最值得注意的地方。

**该项目的消费者只提交了一个长期运行的任务，而且这个任务内部包含无限循环：**

```
for (;;) {
    // 持续消费 Redis 队列
}
```

因此，在当前实现中，单线程执行器最主要的能力——**将多个独立任务排队并串行执行**——实际上没有得到充分利用。

直接使用线程也可以实现相同的核心消费逻辑：

```java
Thread consumerThread = new Thread(() -> {
    RBlockingDeque<JSONObject> blockingDeque =
            redissonClient.getBlockingDeque(
                    "COUPON_TASK_SEND_NUM_DELAY_QUEUE"
            );

    while (!Thread.currentThread().isInterrupted()) {
        try {
            JSONObject task = blockingDeque.take();

            // 处理队列任务
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            break;
        }
    }
});

consumerThread.setName("delay-coupon-consumer");
consumerThread.setDaemon(true);
consumerThread.start();
```

这个示例展示了直接创建消费者线程的思路。实际代码还需要根据 Redisson 客户端、应用关闭流程和异常处理要求完善资源管理。

那么，为什么原作者仍然使用单线程执行器？

可能的原因包括：

1. **统一使用 ExecutorService 抽象。** 项目将后台任务都交给执行器管理，保持实现风格一致。
2. **方便扩展。** 如果未来需要将不同的任务提交给同一个执行器，就可以复用其串行执行和排队能力。
3. **减少手动管理线程的工作。** 执行器提供了统一的任务提交和关闭接口。

不过，这些只是合理的设计动机，并不能证明作者一定是出于这些原因选择了这种实现。

从当前代码本身来看，不能说使用单线程池一定比直接创建线程更好。对于一个长期运行、只负责消费队列的任务，直接创建并管理专用线程也是合理的选择。

而且，当前实现没有保存 `ExecutorService` 的引用，也没有提供显式关闭机制，所以它并没有充分体现执行器在生命周期管理方面的优势。

## 六、实际开发中应该如何选择？

| 场景                           | 一般可以考虑的方式                                          |
| ------------------------------ | ----------------------------------------------------------- |
| 简单、独立的一次性后台任务     | `Thread`，或者使用已有的任务执行器                          |
| 多个任务需要复用线程并统一管理 | `ThreadPoolExecutor`                                        |
| 多个任务需要由一个线程串行执行 | `newSingleThreadExecutor()`                                 |
| 持续运行的专用队列消费者       | 专用线程或受生命周期管理的执行器，取决于项目架构            |
| Spring Boot 中的后台任务       | 优先结合 Spring Bean 生命周期、线程池配置和应用关闭流程设计 |

这里不存在一条适用于所有项目的绝对规则。选择哪种方式，需要看任务数量、执行模型、生命周期以及异常恢复要求。

在 Spring Boot 项目中，如果使用执行器或长期运行的消费者，还应该考虑应用关闭时如何停止接收新任务、处理中任务、响应线程中断，以及释放相关资源。

## 七、总结

`new Thread()` 与 `Executors.newSingleThreadExecutor()` 都可以让任务在独立工作线程中执行，但二者的抽象层次不同。

直接创建线程适合简单、独立的执行需求；单线程执行器则提供任务提交、串行排队和工作线程管理等能力。

在优惠券项目中，作者使用单线程执行器运行一个长期的 Redis 队列消费循环。这个设计可以工作，但由于只提交了一个无限循环任务，单线程执行器的排队能力并没有得到充分利用，因此直接使用专用线程同样可行。

真正需要掌握的不是机械记忆应该使用哪种 API，而是理解：

**线程解决任务由谁执行的问题，执行器进一步解决任务如何提交、排队与管理的问题。**

在阅读 Java 工程代码时，应当根据实际的执行模型评价设计，而不是认为使用了线程池就一定比直接创建线程更合理。

### 参考资料

- [Java 17 官方文档：Executors](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/Executors.html)
- [Java 17 官方文档：ExecutorService](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ExecutorService.html)
- [Java 17 官方文档：Thread](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Thread.html)