# Java Stream API 详解：从 map、filter 到 flatMap 与 collect

在阅读酒店 GDS 系统的多分销商并发取价代码时，我遇到了这样一段代码：

```java
List<CompletableFuture<List<SupplierPriceVO>>> futures =
    suppliers.stream()
        .map(m -> CompletableFuture.supplyAsync(
            () -> invokeAdapter(m, req, customerDictMap),
            priceExecutor
        ))
        .collect(Collectors.toList());
```

这段代码将 Stream API、Lambda 表达式和 CompletableFuture 结合在了一起。

其中，Stream 负责遍历和处理集合数据，map() 负责将每个分销商对象转换为一个异步任务，CompletableFuture 负责提交异步任务，最后 collect() 将所有任务收集到一个 List 中。

要真正理解这段代码，需要先掌握 Java Stream API 的基本概念和常见操作。

## 一、什么是 Stream？

Stream 是 Java 8 引入的集合数据处理 API，位于：

```
java.util.stream
```

它允许我们以类似流水线的方式处理集合数据，例如筛选、转换、排序、去重和收集结果。

先看一个简单的例子。

假设我们有一个分销商列表：

```
List<String> suppliers = Arrays.asList(
    "携程",
    "美团",
    "Agoda",
    "飞猪"
);
```

现在需要遍历所有分销商并打印名称。

传统写法：

```
for (String supplier : suppliers) {
    System.out.println(supplier);
}
```

Stream 写法：

```
suppliers.stream()
    .forEach(supplier -> System.out.println(supplier));
```

两种方式都能完成遍历，但 Stream 的优势不仅仅是减少代码量。

当我们需要连续执行多个数据处理操作时，Stream 可以将这些操作组织成一条清晰的数据处理流水线。

例如：

```
suppliers.stream()
    .filter(supplier -> supplier.length() > 2)
    .map(String::toUpperCase)
    .forEach(System.out::println);
```

这段代码依次完成：

1. 遍历分销商集合。
2. 筛选名称长度大于 2 的元素。
3. 将名称转换为大写。
4. 输出最终结果。

可以看出，Stream 更关注数据应该经过哪些处理步骤，而不是手动编写循环控制逻辑。

### 1. Stream 和 Collection 有什么区别？

这是一个容易混淆的知识点。

| 对比             | Collection     | Stream                   |
| ---------------- | -------------- | ------------------------ |
| 本质             | 集合容器       | 数据处理流水线           |
| 主要作用         | 存储和管理数据 | 处理数据                 |
| 是否保存数据     | 是             | 本身不负责保存数据       |
| 是否支持链式操作 | 不以此为核心   | 支持                     |
| 是否支持延迟执行 | 不适用         | 支持                     |
| 是否可以重复使用 | 可以           | 一个 Stream 只能消费一次 |

例如：

```
List<String> list = Arrays.asList("A", "B", "C");

Stream<String> stream = list.stream();
```

这里 List 保存了实际的数据，而 Stream 只是提供一套处理这些数据的操作流程。

## 二、Stream 的基本执行模型

Stream 通常由三个部分组成：

1. 数据源（Source）。
2. 中间操作（Intermediate Operations）。
3. 终止操作（Terminal Operations）。

例如：

```
List<String> result = suppliers.stream()
    .filter(s -> s.length() > 2)
    .map(String::toUpperCase)
    .collect(Collectors.toList());
```

可以拆成：

```
数据源
  suppliers
      |
      v
创建 Stream
      |
      v
中间操作 filter()
      |
      v
中间操作 map()
      |
      v
终止操作 collect()
      |
      v
得到最终 List
```

### 1. 数据源

Stream 可以从不同的数据源创建。

常见方式：

```
// 从 List 创建
list.stream();

// 从 Set 创建
set.stream();

// 从数组创建
Arrays.stream(array);

// 直接创建 Stream
Stream.of("A", "B", "C");
```

其中：

```
suppliers.stream()
```

就是从 suppliers 集合创建一个 Stream。

### 2. 中间操作

中间操作用于对数据进行处理，但不会立即执行整个流水线。

常见操作：

| 方法       | 作用         | 示例                          |
| ---------- | ------------ | ----------------------------- |
| filter()   | 筛选元素     | 只保留指定分销商              |
| map()      | 转换元素     | 将对象转换为其他类型          |
| flatMap()  | 展平嵌套结构 | 将多个 List 合并成一个 Stream |
| distinct() | 去重         | 去除重复元素                  |
| sorted()   | 排序         | 按价格升序                    |
| limit()    | 限制数量     | 只取前 5 条                   |
| skip()     | 跳过元素     | 跳过前 3 条                   |

中间操作的一个重要特征是：**惰性执行。**

例如：

```
Stream<String> stream = suppliers.stream()
    .filter(s -> {
        System.out.println("正在筛选：" + s);
        return s.length() > 2;
    });
```

即使定义了 filter()，此时也不会立即遍历集合并打印内容。

因为还没有执行终止操作。

只有继续调用：

```
List<String> result = stream.collect(Collectors.toList());
```

才会真正触发整个流水线的执行。

### 3. 终止操作

终止操作会触发 Stream 流水线执行，并产生最终结果或者副作用。

常见操作：

| 方法        | 作用                           |
| ----------- | ------------------------------ |
| collect()   | 收集结果到集合等容器           |
| forEach()   | 遍历并执行操作                 |
| count()     | 统计元素数量                   |
| reduce()    | 将元素归约为一个结果           |
| findFirst() | 获取第一个元素                 |
| anyMatch()  | 判断是否至少有一个元素满足条件 |
| allMatch()  | 判断是否所有元素都满足条件     |
| noneMatch() | 判断是否没有元素满足条件       |

例如：

```
long count = suppliers.stream()
    .filter(s -> s.length() > 2)
    .count();
```

这里 count() 就是终止操作。

## 三、重点理解 map()：将一种数据转换成另一种数据

在实际开发中，map() 是最常见的 Stream 操作之一。

它的核心作用是：

**将 Stream 中的每一个元素转换成另一个元素。**

例如：

```
List<String> names = Arrays.asList(
    "携程",
    "美团",
    "Agoda"
);

List<Integer> lengths = names.stream()
    .map(name -> name.length())
    .collect(Collectors.toList());
```

原始数据：

```
["携程", "美团", "Agoda"]
```

经过 map()：

```
[2, 2, 5]
```

可以理解为：

```
原始元素             转换逻辑              新元素

"携程"       ->     name.length()    ->      2
"美团"       ->     name.length()    ->      2
"Agoda"      ->     name.length()    ->      5
```

### 1. map() 的方法签名

简化后的定义：

```
<R> Stream<R> map(
    Function<? super T, ? extends R> mapper
);
```

这里的 Function 是一个函数式接口：

```
@FunctionalInterface
public interface Function<T, R> {

    R apply(T t);

}
```

它接收一个 T 类型的参数，经过处理后返回一个 R 类型的结果。

因此：

```
.map(name -> name.length())
```

本质上就是为 Function 提供了一个实现。

### 2. map() 不仅可以转换简单数据类型，还可以转换对象

例如：

```
class SupplierMapping {

    private String customerCode;

    private String cHotelId;

    // getter、setter
}
```

现在有一个：

```
List<SupplierMapping> mappings;
```

如果只想提取其中的 customerCode：

```
List<String> customerCodes = mappings.stream()
    .map(m -> m.getCustomerCode())
    .collect(Collectors.toList());
```

这里：

```
SupplierMapping -> String
```

这就是对象属性提取。

如果想把一个对象转换成另一个 DTO，也可以使用 map()：

```
List<SupplierDTO> result = mappings.stream()
    .map(m -> new SupplierDTO(
        m.getCustomerCode(),
        m.getCHotelId()
    ))
    .collect(Collectors.toList());
```

所以，map() 的本质不是简单的属性提取，而是**一对一的数据转换**。

## 四、重点理解 filter()：筛选符合条件的数据

filter() 用于过滤集合中的元素。

它的参数是 Predicate 函数式接口：

```
@FunctionalInterface
public interface Predicate<T> {

    boolean test(T t);

}
```

它接收一个元素，返回 true 或 false。

例如：

```
List<Integer> prices = Arrays.asList(
    100, 200, 300, 400, 500
);

List<Integer> result = prices.stream()
    .filter(price -> price >= 300)
    .collect(Collectors.toList());
```

最终得到：

```
[300, 400, 500]
```

### 1. filter() 的业务应用

假设系统查询了多个分销商，但只希望保留已经开通的分销商：

```
List<SupplierMapping> target = mappings.stream()
    .filter(m -> allowedCodes.contains(m.getCustomerCode()))
    .collect(Collectors.toList());
```

这段代码的含义：

遍历所有映射对象，只保留 customerCode 存在于 allowedCodes 中的记录。

### 2. filter() 和 map() 可以组合使用

```
List<String> result = mappings.stream()
    .filter(m -> m.getCHotelId() != null)
    .map(m -> m.getCustomerCode())
    .collect(Collectors.toList());
```

执行顺序：

1. 先过滤掉没有渠道酒店 ID 的记录。
2. 再提取剩余记录的 customerCode。
3. 收集成 List。

这里也体现了 Stream 的一个特点：可以将多个操作串联起来。

## 五、重点理解 flatMap()：解决嵌套集合问题

flatMap() 是比较容易混淆的一个操作。

我们先看一个实际问题。

假设有三个分销商，每个分销商返回一个价格列表：

```
List<List<Integer>> prices = Arrays.asList(
    Arrays.asList(100, 200),
    Arrays.asList(300, 400),
    Arrays.asList(500, 600)
);
```

现在希望把所有价格合并到一个 List 中。

如果使用 map()：

```
List<Stream<Integer>> result = prices.stream()
    .map(list -> list.stream())
    .collect(Collectors.toList());
```

得到的是多个 Stream 对象组成的集合，而不是一个统一的价格流。

因为 map() 只负责转换，不负责展平嵌套结构。

这时就需要 flatMap()。

### 1. 使用 flatMap() 展平集合

```
List<Integer> result = prices.stream()
    .flatMap(list -> list.stream())
    .collect(Collectors.toList());
```

最终结果：

```
[100, 200, 300, 400, 500, 600]
```

它的执行过程：

```
List<List<Integer>>
        |
        v
     Stream
        |
        v
   flatMap()
        |
        +------> [100, 200]
        |
        +------> [300, 400]
        |
        +------> [500, 600]
        |
        v
 合并为一个 Stream<Integer>
        |
        v
     collect()
        |
        v
 List<Integer>
```

### 2. map() 和 flatMap() 的区别

| 对比     | map()              | flatMap()        |
| -------- | ------------------ | ---------------- |
| 主要作用 | 一对一转换         | 一对多转换并展平 |
| 转换结果 | 一个新元素         | 一个 Stream      |
| 是否展平 | 否                 | 是               |
| 常见场景 | 对象转换、属性提取 | 合并多个集合     |

可以记住：

- map()：转换元素。
- flatMap()：转换后再展平。

## 六、collect()：将处理结果收集起来

前面介绍了很多中间操作，它们都不会直接产生最终集合。

这就需要 collect()。

例如：

```
List<String> result = suppliers.stream()
    .filter(s -> s.length() > 2)
    .map(String::toUpperCase)
    .collect(Collectors.toList());
```

其中：

```
collect(Collectors.toList())
```

表示将 Stream 中的元素收集为一个 List。

常见收集方式：

### 1. 收集为 List

```
List<String> list = suppliers.stream()
    .collect(Collectors.toList());
```

### 2. 收集为 Set

```
Set<String> set = suppliers.stream()
    .collect(Collectors.toSet());
```

适合需要去重的场景。

### 3. 收集为 Map

```
Map<String, SupplierMapping> map = mappings.stream()
    .collect(Collectors.toMap(
        m -> m.getCustomerCode(),
        m -> m
    ));
```

这里：

- 第一个 Lambda：指定 Map 的 key。
- 第二个 Lambda：指定 Map 的 value。

如果 key 可能重复，还需要提供第三个参数指定冲突处理规则：

```
Map<String, SupplierMapping> map = mappings.stream()
    .collect(Collectors.toMap(
        SupplierMapping::getCustomerCode,
        m -> m,
        (existing, replacing) -> existing
    ));
```

这里表示遇到重复 key 时保留已有值。

### 4. groupingBy()：分组统计

例如按照分销商编码分组：

```
Map<String, List<SupplierMapping>> grouped =
    mappings.stream()
        .collect(Collectors.groupingBy(
            SupplierMapping::getCustomerCode
        ));
```

这也是实际业务中经常使用的操作。

## 七、回到酒店 GDS 项目：完整拆解多分销商并发取价代码

现在重新看最开始的代码：

```
List<CompletableFuture<List<SupplierPriceVO>>> futures =
    suppliers.stream()
        .map(m -> CompletableFuture.supplyAsync(
            () -> invokeAdapter(m, req, customerDictMap),
            priceExecutor
        ))
        .collect(Collectors.toList());
```

我们逐段分析。

### 1. 创建 Stream

```
suppliers.stream()
```

从分销商集合创建 Stream。

假设：

```
suppliers = [
    携程,
    美团,
    Agoda,
    飞猪
]
```

### 2. 使用 map() 转换元素

```
.map(m -> CompletableFuture.supplyAsync(...))
```

map() 接收一个 Function。

这里的 m 就是当前遍历到的 SupplierMapping 对象。

原来：

```
SupplierMapping
```

经过转换后：

```
CompletableFuture<List<SupplierPriceVO>>
```

也就是说，每一个分销商对象都会被转换为一个异步任务对象。

### 3. 第二层 Lambda：提供异步任务

```
() -> invokeAdapter(m, req, customerDictMap)
```

这是 supplyAsync() 接收的 Supplier。

它描述了具体的业务逻辑：

调用当前分销商对应的 Adapter，查询价格，并返回价格列表。

### 4. 指定线程池

```
priceExecutor
```

告诉 CompletableFuture 使用指定的 Executor 执行任务。

因此，Lambda 描述任务内容，线程池负责安排任务执行。

需要注意：外层使用的是普通 stream()，map() 本身仍由调用线程顺序执行；真正的并发来自每次调用 supplyAsync() 后提交到 priceExecutor 的异步任务，而不是来自 Stream 自身。

### 5. 使用 collect() 收集异步任务

```
.collect(Collectors.toList());
```

最终得到：

```
List<CompletableFuture<List<SupplierPriceVO>>>
```

假设有四个分销商，那么这个 List 就包含四个 CompletableFuture。

注意，此时收集的是异步任务对象，不是最终的价格数据。

整个过程：

```
原始集合
List<SupplierMapping>
        |
        v
    stream()
        |
        v
      map()
        |
        +---- 携程 -> CompletableFuture<List<VO>>
        |
        +---- 美团 -> CompletableFuture<List<VO>>
        |
        +---- Agoda -> CompletableFuture<List<VO>>
        |
        +---- 飞猪 -> CompletableFuture<List<VO>>
        |
        v
    collect()
        |
        v
List<CompletableFuture<List<VO>>>
```

### 6. 后续如何获取所有价格？

在前面收集好异步任务后，通常还会有：

```
List<SupplierPriceVO> allResults =
    futures.stream()
        .map(CompletableFuture::join)
        .flatMap(List::stream)
        .collect(Collectors.toList());
```

这里又使用了一次 Stream。

执行过程：

1. stream()：遍历所有 CompletableFuture。
2. map()：通过 join() 获取每个异步任务的价格列表。
3. flatMap()：将多个价格列表展平。
4. collect()：将全部价格收集到一个 List。

最终得到：

```
List<SupplierPriceVO>
```

这样就完成了多个分销商价格数据的汇总。

## 八、Stream 使用时的几个注意事项

### 1. Stream 只能消费一次

下面的代码是错误的：

```
Stream<String> stream = suppliers.stream();

stream.forEach(System.out::println);

stream.count(); // 抛出 IllegalStateException
```

因为第一次终止操作已经消费了这个 Stream，不能再次使用。

如果需要重新处理，应该重新从集合创建 Stream：

```
suppliers.stream().forEach(System.out::println);

long count = suppliers.stream().count();
```

### 2. Stream 不应该随意修改原始集合

不推荐：

```
suppliers.stream()
    .forEach(supplier -> suppliers.remove(supplier));
```

这可能导致并发修改异常或不符合预期的行为。

更推荐通过 filter() 生成新的结果：

```
List<String> result = suppliers.stream()
    .filter(supplier -> !supplier.equals("美团"))
    .collect(Collectors.toList());
```

### 3. stream() 和 parallelStream() 不一样

```
suppliers.stream()
```

创建普通 Stream，流水线操作默认在调用线程执行。

```
suppliers.parallelStream()
```

创建并行 Stream，可以让 Stream 的处理过程并行化，通常涉及 ForkJoinPool.commonPool()。

需要注意：

**Stream 并行处理与 CompletableFuture 异步提交任务是两种不同的并发处理方式。**

我们项目中的：

```
suppliers.stream()
    .map(m -> CompletableFuture.supplyAsync(..., priceExecutor))
```

虽然使用了普通 stream()，但依然可以并发执行，因为每次 map() 都向指定线程池提交了一个异步任务。

### 4. 不要把 peek() 当作主要业务操作

peek() 可以观察 Stream 流水线中的元素，常用于调试：

```
suppliers.stream()
    .peek(System.out::println)
    .filter(s -> s.length() > 2)
    .collect(Collectors.toList());
```

但不建议把重要业务逻辑放在 peek() 中，因为它属于中间操作，只有流水线真正执行时才会触发。

## 九、知识总结

| 方法       | 类型     | 作用        | 常见用途              |
| ---------- | -------- | ----------- | --------------------- |
| stream()   | 创建操作 | 创建 Stream | 从集合开始处理        |
| filter()   | 中间操作 | 筛选元素    | 条件过滤              |
| map()      | 中间操作 | 转换元素    | 对象映射、属性提取    |
| flatMap()  | 中间操作 | 转换并展平  | 合并嵌套集合          |
| distinct() | 中间操作 | 去重        | 删除重复数据          |
| sorted()   | 中间操作 | 排序        | 价格排序              |
| limit()    | 中间操作 | 限制数量    | 获取前 N 条           |
| skip()     | 中间操作 | 跳过元素    | 分页处理              |
| collect()  | 终止操作 | 收集结果    | 转换为 List、Set、Map |
| forEach()  | 终止操作 | 遍历执行    | 打印、执行操作        |
| count()    | 终止操作 | 统计数量    | 记录数量              |
| reduce()   | 终止操作 | 归约数据    | 求和、聚合            |

最后，回到本文最开始的代码：

```
List<CompletableFuture<List<SupplierPriceVO>>> futures =
    suppliers.stream()
        .map(m -> CompletableFuture.supplyAsync(
            () -> invokeAdapter(m, req, customerDictMap),
            priceExecutor
        ))
        .collect(Collectors.toList());
```

可以这样理解：

**Stream 负责组织数据处理流程，map() 负责将分销商对象转换为异步任务，CompletableFuture 负责异步计算，线程池负责安排任务执行，collect() 负责收集所有异步任务。**

这就是 Stream API 在实际 Java 业务开发中的一个典型应用。

学习 Stream 不应该停留在背诵 API，而应该理解数据如何从原始集合经过一系列操作，最终转换成我们需要的结果。