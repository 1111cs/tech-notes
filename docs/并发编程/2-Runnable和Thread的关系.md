Runnable 是一个任务接口，Thread 是一个线程类。Runnable 描述线程要执行什么，Thread 负责提供线程来执行这个任务。

我们一步一步理解。

# 一、Runnable 是什么？

`Runnable` 是 Java 提供的一个函数式接口，位于：java.lang.Runnable

它的定义非常简单：

```
@FunctionalInterface
public interface Runnable {

    public abstract void run();

}
```

只有一个抽象方法：void run();

它有两个特点：

- 不接收参数。
- 不返回结果。

因此，Runnable 可以用来描述一个需要执行的任务。

例如：

```
Runnable task = new Runnable() {
    @Override
    public void run() {
        System.out.println("正在执行任务...");
    }
};
```

这里我们创建了一个 Runnable 对象，并实现了 `run()` 方法。

这个对象描述了一项任务：

执行时，打印一条信息。

注意：目前只是定义了任务，还没有真正执行它。

# 二、Runnable 和 Thread 有什么关系？

这才是重点。我们先看 Thread 的定义：

```java
public class Thread implements Runnable {

    // ...

    @Override
    public void run() {
        // 执行线程任务
    }
}
```

你发现了吗？

Thread 本身就实现了 Runnable 接口。

这意味着 Thread 本身也具备 Runnable 所定义的任务执行行为。

但两者的职责并不一样：

| 对比                 | Runnable   | Thread           |
| -------------------- | ---------- | ---------------- |
| 本质                 | 接口       | 类               |
| 主要职责             | 描述任务   | 创建和管理线程   |
| 是否包含 run()       | 定义 run() | 实现 run()       |
| 是否代表一个独立线程 | 否         | 是               |
| 是否可以直接启动     | 否         | 可以调用 start() |

可以这样理解：

- Runnable：告诉你要干什么。
- Thread：提供一个线程去干这件事。

## 1. 让 Thread 执行 Runnable 任务

我们写一个完整例子：

```java
public class RunnableDemo {

    public static void main(String[] args) {

        // 1. 定义任务
        Runnable task = () -> {
            System.out.println("任务正在执行");
            System.out.println(
                Thread.currentThread().getName()
            );
        };

        // 2. 创建线程，并指定执行这个任务
        Thread thread = new Thread(task);

        // 3. 启动线程
        thread.start();
    }
}
```

执行过程：

Runnable task 定义具体的任务逻辑

传递给 Thread

new Thread(task)：创建线程对象，关联任务

调用 start()，JVM 启动新的执行线程，新线程执行 Runnable 的 run() 方法

这里最关键的是：

```
Thread thread = new Thread(task);
thread.start();
```

`new Thread(task)` 只是创建线程对象，并不会立即启动线程。

`start()` 才是真正启动线程的方法。JVM 会安排新的执行线程，并在该线程中执行对应的 `run()` 方法。

# 三、特别注意：start() 和 run() 的区别

这是 Java 面试非常经典的一道题。

我们看两段代码。

第一种：调用 start()

```
Runnable task = () -> {
    System.out.println(
        Thread.currentThread().getName()
    );
};

Thread thread = new Thread(task);

thread.start();
```

输出类似：

```
Thread-0
```

因为这里启动了一个新的线程。

第二种：直接调用 run()

```java
Runnable task = () -> {
    System.out.println(
        Thread.currentThread().getName()
    );
};

Thread thread = new Thread(task);

thread.run();
```

输出：

```
main
```

为什么？

因为 `run()` 本质上只是一个普通方法调用。

你直接调用它，并不会创建新的线程，而是在当前线程中执行。

记住：

| 方法      | 是否启动新线程 | 执行位置 |
| --------- | -------------- | -------- |
| `start()` | 是             | 新线程   |
| `run()`   | 否             | 当前线程 |

千万不要把 start() 和 run() 混淆。

# 四、既然有 Runnable，为什么还需要线程池？

这是联系到你目前 GDS 项目最重要的地方。

假设我们需要调用 100 个分销商接口。

最原始的方式：

```java
for (int i = 0; i < 100; i++) {

    Runnable task = () -> {
        querySupplierPrice();
    };

    new Thread(task).start();
}
```

这意味着每次都创建一个新的线程。

如果任务很多，就可能产生大量线程，带来线程创建和销毁开销、内存消耗，以及线程调度压力。

因此，我们引入线程池。

例如：

```
ExecutorService executor =
    Executors.newFixedThreadPool(10);

for (int i = 0; i < 100; i++) {

    Runnable task = () -> {
        querySupplierPrice();
    };

    executor.execute(task);
}
```

现在的逻辑变成：

1. 创建一个拥有 10 个工作线程的线程池。
2. 创建 100 个 Runnable 任务。
3. 将任务提交给线程池。
4. 线程池使用工作线程执行任务。
5. 任务执行完毕后，工作线程可以继续执行其他任务。

# 五、Runnable 和 Callable 有什么区别？

再往前走一步，你还需要认识 `Callable`。

因为 Runnable 有一个限制：**void run();它没有返回值。**

但实际业务中，我们经常需要执行任务后拿到结果。

例如：

```
List<SupplierPriceVO> result =
    querySupplierPrice();
```

这时可以考虑 Callable。

它的定义：

```
@FunctionalInterface
public interface Callable<V> {

    V call() throws Exception;

}
```

对比一下：

| 对比                 | Runnable       | Callable       |
| -------------------- | -------------- | -------------- |
| 抽象方法             | run()          | call()         |
| 参数                 | 无             | 无             |
| 返回值               | 无             | 有             |
| 是否允许抛出受检异常 | 不允许直接声明 | 允许           |
| 常见使用场景         | 执行操作       | 执行并返回结果 |

例如：

```
Callable<String> task = () -> {
    return "查询成功";
};
```

使用线程池的 `submit()` 提交：

```
ExecutorService executor =
    Executors.newFixedThreadPool(4);

Future<String> future =
    executor.submit(task);

String result = future.get();
```

这里的 `Future<String>` 就可以代表未来的执行结果。

# 六、回到你的酒店 GDS 项目：Runnable、Supplier 和 CompletableFuture

现在把我们之前学习的知识联系起来。

你之前的代码：

```
CompletableFuture.supplyAsync(
    () -> {
        return invokeAdapter(m, req, customerDictMap);
    },
    priceExecutor
);
```

**这里传入的 Lambda 实际上是：Supplier<List<SupplierPriceVO>>而不是 Runnable。**

为什么？因为 `supplyAsync()` 需要一个有返回值的任务。

如果换成：

```
CompletableFuture.runAsync(
    () -> {
        invokeAdapter(m, req, customerDictMap);
    },
    priceExecutor
);
```

它就不需要返回结果了。

我们把几个知识点放在一起：

| 技术               | 作用                       |
| ------------------ | -------------------------- |
| Runnable           | 定义无返回值的任务         |
| Supplier           | 定义无参数、有返回值的任务 |
| Thread             | 创建和管理线程             |
| Executor           | 提交和调度任务             |
| ThreadPoolExecutor | 管理线程池和工作线程       |
| CompletableFuture  | 管理异步计算及其后续操作   |

还有一个容易忽略的细节：`CompletableFuture.runAsync()` 和 `supplyAsync()` 内部都使用了 Executor 来安排任务执行，但它们不要求我们手动创建 Thread。

