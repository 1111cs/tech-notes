## Lambda 表达式和函数式接口

### 1. 什么是 Lambda 表达式？

Lambda 表达式是 Java 8 引入的一种语法，用于简洁地表示函数式接口的实现。

先看一个传统的匿名内部类：

```
Runnable task = new Runnable() {
    @Override
    public void run() {
        System.out.println("执行任务");
    }
};
```

使用 Lambda 表达式可以简化为：

```
Runnable task = () -> {
    System.out.println("执行任务");
};
```

两种写法都表示实现 Runnable 接口，并提供 run() 方法的具体逻辑。

Lambda 的基本语法：

```
(参数列表) -> {
    方法体
}
```

可以拆解为三个部分：

- 参数列表：表示方法需要接收的参数。
- `->`：Lambda 运算符，用于分隔参数和执行逻辑。
- 方法体：具体需要执行的业务代码。

例如：

```
// 无参数
() -> System.out.println("Hello");

// 一个参数
name -> System.out.println(name);

// 多个参数
(a, b) -> a + b;
```

需要注意：Lambda 不是语法上直接创建一个匿名内部类，而是函数式接口的一种实现形式。编译器根据目标函数式接口确定 Lambda 的类型。

### 2. 什么是函数式接口？

Lambda 表达式并不能随意使用，它需要有明确的目标类型。

这个目标类型通常就是函数式接口。

函数式接口具有一个核心特征：

**只有一个需要实现的抽象方法。**

例如 Runnable：

```
@FunctionalInterface
public interface Runnable {

    void run();

}
```

因为 Runnable 只有一个抽象方法，所以可以使用 Lambda 表达式实现它：

```
Runnable task = () -> {
    System.out.println("执行任务");
};
```

这里的 Lambda 实际上就是为 run() 方法提供具体实现。

`@FunctionalInterface` 是一个标记注解，用于帮助编译器检查接口是否符合函数式接口的要求。

## 认识 Java 常见的四种函数式接口

理解 Lambda 之后，还需要认识 Java 提供的几个常用函数式接口。

它们位于 `java.util.function` 包中。

### 1. Runnable：无参数、无返回值

```
@FunctionalInterface
public interface Runnable {

    void run();

}
```

使用示例：

```
Runnable task = () -> {
    System.out.println("开始执行任务");
};
```

适用于只需要执行某项操作，不需要返回结果的场景。

### 2. Supplier<T>：无参数、有返回值

```
@FunctionalInterface
public interface Supplier<T> {

    T get();

}
```

使用示例：

```
Supplier<String> supplier = () -> {
    return "查询成功";
};

String result = supplier.get();
```

Supplier 的特点：

- 没有参数。
- 有返回值。
- 通过 get() 方法获取结果。

这也是后面 CompletableFuture.supplyAsync() 使用的函数式接口。

### 3. Consumer<T>：有参数、无返回值

```
@FunctionalInterface
public interface Consumer<T> {

    void accept(T t);

}
```

使用示例：

```
Consumer<String> consumer = name -> {
    System.out.println(name);
};

consumer.accept("Java");
```

适用于接收一个参数并执行操作，不需要返回结果的场景。

### 4. Function<T,R>

```
@FunctionalInterface
public interface Function<T, R> {

    R apply(T t);

}
```

使用示例：

```
Function<String, Integer> function = name -> {
    return name.length();
};

Integer length = function.apply("Java");

```

适用于接收一个参数，经过处理后返回另一个结果的场景。

### 5. 四种接口对比

| 接口          | 抽象方法  | 参数 | 返回值 |
| ------------- | --------- | ---- | ------ |
| Runnable      | run()     | 无   | 无     |
| Supplier<T>   | get()     | 无   | T      |
| Consumer<T>   | accept(T) | T    | 无     |
| Function<T,R> | apply(T)  | T    | R      |

记忆方法：

- Runnable：执行任务。
- Supplier：提供结果。
- Consumer：消费参数。
- Function：转换数据。

