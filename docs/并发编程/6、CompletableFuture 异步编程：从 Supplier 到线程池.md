# Java Lambda 表达式与 CompletableFuture 异步编程：从 Supplier 到线程池

在阅读酒店 GDS 系统的分销商模拟出价代码时，我遇到了一段比较典型的 Java 并发代码：

```java
List<CompletableFuture<List<SupplierPriceVO>>> futures =
    distinctSuppliers.values().stream()
        .map(m -> CompletableFuture.supplyAsync(
            () -> {
                long t0 = System.currentTimeMillis();

                List<SupplierPriceVO> r =
                    invokeAdapter(m, req, customerDictMap);

                log.info("[比价分发] {} 完成, 耗时: {} ms",
                    m.getCustomerCode(),
                    System.currentTimeMillis() - t0);

                return r;
            },
            priceExecutor
        ).orTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
         .exceptionally(ex -> {
             log.warn("[比价分发] {} 异常/超时: {}",
                 m.getCustomerCode(), ex.getMessage());

             return buildFallback(m, ex, customerDictMap);
         }))
        .collect(Collectors.toList());
```

这段代码同时涉及 Stream API、Lambda 表达式、函数式接口、CompletableFuture 和线程池。

乍一看嵌套比较多，但如果把它拆开理解，就会发现各部分的职责非常明确。

本文从 Lambda 表达式开始，逐步理解异步任务是如何提交给线程池执行的，以及 CompletableFuture 如何管理任务结果。



## 三、CompletableFuture.supplyAsync() 到底是什么？

前面介绍的 Supplier，在 Java 并发编程中有一个非常重要的应用场景：CompletableFuture。

### 1. 先认识 CompletableFuture

CompletableFuture 是 Java 8 引入的异步编程工具，位于：

```
java.util.concurrent
```

它实现了 Future 和 CompletionStage 接口。

其中：

- Future：表示一个尚未完成或者已经完成的异步计算结果。
- CompletionStage：支持对异步任务进行后续处理和组合。

简单来说，CompletableFuture 允许我们提交一个任务，让它在后台执行，而调用线程不必一直等待任务完成。

例如：

```
CompletableFuture<String> future =
    CompletableFuture.supplyAsync(() -> {
        return "查询成功";
    });
```

这里并没有直接得到 String，而是得到：

```
CompletableFuture<String>
```

它代表一个未来会产生 String 结果的异步任务。

### 2. supplyAsync() 的方法签名

我们看一下它的核心方法：

```
public static <U> CompletableFuture<U> supplyAsync(
    Supplier<U> supplier,
    Executor executor
)
```

它接收两个参数：

| 参数     | 类型        | 作用                   |
| -------- | ----------- | ---------------------- |
| supplier | Supplier&lt;U&gt; | 提供具体的任务执行逻辑 |
| executor | Executor    | 指定任务使用哪个执行器 |

重点理解这两个参数的职责：

**Supplier 描述要执行什么任务，Executor 决定由哪个执行器安排任务执行。**

例如：

```
CompletableFuture<String> future =
    CompletableFuture.supplyAsync(
        () -> {
            return "查询成功";
        },
        priceExecutor
    );
```

这里：

```
() -> {
    return "查询成功";
}
```

实际上是对 Supplier&lt;String&gt; 的实现。

它等价于：

```
new Supplier<String>() {
    @Override
    public String get() {
        return "查询成功";
    }
};
```

因此，我们终于可以理解为什么 supplyAsync() 的第一个参数是一个没有参数、但是有返回值的 Lambda 表达式了。

因为 Supplier 的 get() 方法本身就是无参数、有返回值的。

### 3. supplyAsync() 与 runAsync() 的区别

CompletableFuture 还提供了另一个常用方法：

```
public static CompletableFuture<Void> runAsync(
    Runnable runnable,
    Executor executor
)
```

两者的区别：

| 方法          | 函数式接口  | 是否有返回值 | 适用场景                   |
| ------------- | ----------- | ------------ | -------------------------- |
| supplyAsync() | Supplier&lt;T&gt; | 有           | 异步查询、计算并返回结果   |
| runAsync()    | Runnable    | 无           | 异步发送通知、执行日志操作 |

例如：

```
// 需要返回结果
CompletableFuture<String> future1 =
    CompletableFuture.supplyAsync(
        () -> "执行成功",
        priceExecutor
    );

// 不需要返回结果
CompletableFuture<Void> future2 =
    CompletableFuture.runAsync(
        () -> System.out.println("发送通知"),
        priceExecutor
    );
```

## 四、为什么 supplyAsync() 还需要传入线程池？

这就涉及 Java 的线程池。

### 1. Lambda 和线程池的分工

来看下面的代码：

```
CompletableFuture.supplyAsync(
    () -> {
        return queryHotelPrice();
    },
    priceExecutor
);
```

其中：

```
() -> {
    return queryHotelPrice();
}
```

负责描述具体执行的业务逻辑。

而：

```
priceExecutor
```

负责提供任务执行所使用的线程资源。

可以简单理解为：

- Lambda：告诉程序要做什么。
- Executor：告诉程序由哪个执行器安排任务执行。

### 2. 什么是 Executor？

Executor 是 Java 并发包提供的任务执行器接口。

```
public interface Executor {

    void execute(Runnable command);

}
```

它定义了一个 execute() 方法，用于提交任务。

ExecutorService 则进一步提供了线程池生命周期管理、任务提交和结果获取等能力。

例如：

```
ExecutorService priceExecutor =
    Executors.newFixedThreadPool(4);
```

这里创建了一个固定大小为 4 的线程池。

提交任务：

```
priceExecutor.execute(() -> {
    System.out.println("执行任务");
});
```

线程池会安排工作线程执行任务，而不是要求业务代码每次手动创建 Thread。

实际项目中，通常会将线程池作为 Spring Bean 统一配置和管理，而不是在每次请求时创建一个新的线程池。

### 3. 为什么不直接使用默认线程池？

CompletableFuture 也支持不传入 Executor：

```
CompletableFuture.supplyAsync(() -> {
    return queryHotelPrice();
});
```

这种情况下，默认使用 ForkJoinPool.commonPool()。

但在实际业务系统中，通常更推荐根据任务类型使用独立配置的线程池。

原因包括：

1. 线程资源隔离：避免不同业务任务互相影响。
2. 线程数量控制：避免无限制创建线程。
3. 任务管理：可以统一设置线程池参数。
4. 监控和排查：能够针对特定业务观察线程池运行情况。

例如，酒店价格查询属于涉及外部网络调用的 I/O 密集型任务，可以根据实际并发量、接口响应时间和资源限制配置专门的线程池。

## 五、结合酒店 GDS 项目理解多渠道并发取价

前面讲了很多语法，现在回到真实业务代码。

假设运营人员需要查询某家酒店在四个分销渠道下的报价：

- 携程
- 美团
- Agoda
- 飞猪

系统需要调用各自的适配器获取价格。

### 1. 如果采用串行调用

```
List<SupplierPriceVO> results = new ArrayList<>();

for (SupplierMapping m : suppliers) {

    List<SupplierPriceVO> prices =
        invokeAdapter(m, req, customerDictMap);

    results.addAll(prices);
}
```

假设四个渠道的响应时间分别为：

| 分销商 | 响应时间 |
| ------ | -------- |
| 携程   | 1 秒     |
| 美团   | 2 秒     |
| Agoda  | 3 秒     |
| 飞猪   | 2 秒     |

串行执行时，理论上总耗时约为：

```
1 + 2 + 3 + 2 = 8 秒
```

因为每次调用都需要等待前一个渠道返回之后才能继续。

### 2. 改为 CompletableFuture 并发调用

```
List<CompletableFuture<List<SupplierPriceVO>>> futures =
    new ArrayList<>();

for (SupplierMapping m : suppliers) {

    CompletableFuture<List<SupplierPriceVO>> future =
        CompletableFuture.supplyAsync(
            () -> invokeAdapter(m, req, customerDictMap),
            priceExecutor
        );

    futures.add(future);
}
```

这段代码做了什么？

每次循环都会创建一个异步任务，并将其提交到 priceExecutor。

假设线程池有四个可用工作线程，那么四个渠道的查询任务可以并发执行。

理论上，耗时可以接近：

```
max(1, 2, 3, 2) = 3 秒
```

实际耗时还会受到线程池调度、网络延迟、HTTP 客户端和其他系统开销影响。

### 3. Stream + Lambda 的简洁写法

上面的 for 循环还可以改写为：

```
List<CompletableFuture<List<SupplierPriceVO>>> futures =
    suppliers.stream()
        .map(m -> CompletableFuture.supplyAsync(
            () -> invokeAdapter(m, req, customerDictMap),
            priceExecutor
        ))
        .collect(Collectors.toList());
```

这时出现了两层 Lambda：

第一层：

```
m -> CompletableFuture.supplyAsync(...)
```

这是 Stream.map() 接收的 Function。

它的作用是：**对每个 SupplierMapping 对象进行处理，并返回一个 CompletableFuture。**

第二层：

```
() -> invokeAdapter(m, req, customerDictMap)
```

这是 supplyAsync() 接收的 Supplier。

它的作用是：描述具体的异步查询任务，并返回查询结果。

因此，这两层 Lambda 虽然嵌套在一起，但它们的职责完全不同。

## 六、CompletableFuture 如何获取异步任务结果？

前面提交任务后，我们拿到的是：

```
CompletableFuture<List<SupplierPriceVO>>
```

而不是实际的价格列表。

那么，什么时候才能得到真正的查询结果？

这就需要理解 join()。

### 1. 使用 join() 获取结果

```
List<SupplierPriceVO> result = future.join();
```

join() 会等待异步任务完成。

- 如果任务成功，返回任务结果。
- 如果任务异常完成，通常会抛出 CompletionException。

例如：

```
CompletableFuture<String> future =
    CompletableFuture.supplyAsync(
        () -> "查询成功",
        priceExecutor
    );

String result = future.join();

System.out.println(result);
```

输出：

```
查询成功
```

### 2. 多个任务统一获取结果

回到酒店项目：

```
List<SupplierPriceVO> allResults =
    futures.stream()
        .map(CompletableFuture::join)
        .flatMap(List::stream)
        .collect(Collectors.toList());
```

这段代码可以拆成三个步骤：

**第一步：获取每个异步任务的结果。**

```
.map(CompletableFuture::join)
```

这里使用了方法引用。

它等价于：

```
.map(future -> future.join())
```

得到：

```
Stream<List<SupplierPriceVO>>
```

**第二步：展平嵌套集合。**

```
.flatMap(List::stream)
```

因为每个分销商返回的都是一个 List，如果直接收集，最终会得到 List<List&lt;SupplierPriceVO&gt;>。

flatMap() 会将这些 List 展开成一个统一的 Stream。

**第三步：收集最终结果。**

```
.collect(Collectors.toList());
```

最终得到：

```
List<SupplierPriceVO>
```

这样就把多个分销商返回的价格数据合并到了一个集合中。

需要注意：如果任务在提交时已经并发执行，那么后面依次调用 join() 并不意味着重新串行执行这些任务。它只是等待并取得结果。

## 七、CompletableFuture 的异常处理与超时控制

真实业务中，外部 API 并不总是可靠的。

例如：

| 分销商 | 结果     |
| ------ | -------- |
| 携程   | 正常返回 |
| 美团   | 正常返回 |
| Agoda  | 请求超时 |
| 飞猪   | 正常返回 |

如果某一个分销商查询失败就导致整个价格查询失败，用户体验会非常差。

因此需要异常处理和超时控制。

### 1. exceptionally()：异常兜底

```
CompletableFuture<List<SupplierPriceVO>> future =
    CompletableFuture.supplyAsync(
        () -> invokeAdapter(m, req, customerDictMap),
        priceExecutor
    ).exceptionally(ex -> {
        return buildFallback(m, ex, customerDictMap);
    });
```

exceptionally() 的作用：

当前面的异步阶段异常完成时，执行兜底逻辑，并返回一个替代结果。

注意：它并不是无论成功失败都会执行。正常完成时，不会进入 exceptionally()。

### 2. orTimeout()：超时控制

```
CompletableFuture<List<SupplierPriceVO>> future =
    CompletableFuture.supplyAsync(
        () -> invokeAdapter(m, req, customerDictMap),
        priceExecutor
    ).orTimeout(5, TimeUnit.SECONDS);
```

表示如果异步任务在指定时间内没有完成，则将这个 CompletableFuture 异常完成，超时异常类型为 TimeoutException。

结合异常兜底：

```
CompletableFuture<List<SupplierPriceVO>> future =
    CompletableFuture.supplyAsync(
        () -> invokeAdapter(m, req, customerDictMap),
        priceExecutor
    )
    .orTimeout(5, TimeUnit.SECONDS)
    .exceptionally(ex -> {
        return buildFallback(m, ex, customerDictMap);
    });
```

这样某个渠道超时后，可以返回兜底结果，而不必直接让整个比价流程失败。

**特别注意：orTimeout() 不保证底层正在执行的 HTTP 请求被真正取消。**

它主要改变 CompletableFuture 的完成状态。实际项目仍然需要为 HTTP 客户端配置连接超时、读取超时，并根据需要设计请求取消机制。

## 八、几个容易混淆的知识点

### 1. Lambda 不等于多线程

```
Runnable task = () -> {
    System.out.println("Hello");
};
```

这里只是定义了一个任务，并没有自动创建线程，也没有自动执行。

只有将任务交给线程或执行器执行，它才会真正运行。

### 2. Stream 不等于并行流

```
suppliers.stream()
```

这是普通 Stream，默认采用当前调用线程执行中间操作。

但是：

```
.map(m -> CompletableFuture.supplyAsync(...))
```

每次 map 操作都会提交一个异步任务，因此即使外层使用普通 stream，也可以实现任务并发。

不要将它与：

```
suppliers.parallelStream()
```

混淆。parallelStream() 是另一种并行处理机制。

### 3. CompletableFuture 不等于线程池

CompletableFuture 负责表示和管理异步计算过程。

线程池负责提供线程资源、安排任务执行。

两者通常配合使用，但职责不同。

### 4. join() 不等于异步执行

supplyAsync() 负责提交异步任务。

join() 负责等待并获取结果。

如果在任务提交之后立即 join()，就可能失去多个任务并发执行带来的优势。

因此，正确的思路通常是：先提交全部任务，再统一收集结果。

## 九、知识总结

结合酒店 GDS 的多渠道取价业务，我们可以把整段代码归纳为：

| 技术              | 在项目中的作用                |
| ----------------- | ----------------------------- |
| Stream            | 遍历需要查询的分销商          |
| Lambda            | 简洁地描述每个操作            |
| Function          | 为 map() 提供数据转换逻辑     |
| Supplier          | 为 supplyAsync() 提供异步任务 |
| CompletableFuture | 管理异步计算及其结果          |
| Executor          | 指定任务执行器                |
| ThreadPool        | 管理工作线程与任务执行        |
| join()            | 等待并获取任务结果            |
| flatMap()         | 展平多个分销商返回的集合      |
| exceptionally()   | 异常兜底                      |
| orTimeout()       | 异步阶段超时控制              |

最后，用一句话串起整段业务代码：

**Stream 遍历分销商，Lambda 描述每个任务，CompletableFuture 将任务异步提交给指定线程池，Supplier 提供具体的查询逻辑，join() 获取结果，最后通过 flatMap() 将各个分销商的报价统一合并。**

这就是 Java 8 函数式编程与 CompletableFuture 异步编程在实际业务系统中的一个典型应用。Java Lambda 表达式与 CompletableFuture 异步编程：从 Supplier 到线程池

在阅读酒店 GDS 系统的分销商模拟出价代码时，我遇到了一段比较典型的 Java 并发代码：

```
List<CompletableFuture<List<SupplierPriceVO>>> futures =
    distinctSuppliers.values().stream()
        .map(m -> CompletableFuture.supplyAsync(
            () -> {
                long t0 = System.currentTimeMillis();

                List<SupplierPriceVO> r =
                    invokeAdapter(m, req, customerDictMap);

                log.info("[比价分发] {} 完成, 耗时: {} ms",
                    m.getCustomerCode(),
                    System.currentTimeMillis() - t0);

                return r;
            },
            priceExecutor
        ).orTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
         .exceptionally(ex -> {
             log.warn("[比价分发] {} 异常/超时: {}",
                 m.getCustomerCode(), ex.getMessage());

             return buildFallback(m, ex, customerDictMap);
         }))
        .collect(Collectors.toList());
```

这段代码同时涉及 Stream API、Lambda 表达式、函数式接口、CompletableFuture 和线程池。

乍一看嵌套比较多，但如果把它拆开理解，就会发现各部分的职责非常明确。

本文从 Lambda 表达式开始，逐步理解异步任务是如何提交给线程池执行的，以及 CompletableFuture 如何管理任务结果。