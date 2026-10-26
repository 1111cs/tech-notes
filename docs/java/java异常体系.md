## java异常体系

1. 以下代码的输出结果是？

   ```java
   try {
       int[] arr = new int[1];
       arr[1] = 1;
   } catch (NullPointerException e) {
       System.out.print("A");
   } catch (Exception e) {
       System.out.print("B");
   } finally {
       System.out.print("C");
   }
   ```

   A. A
   B. B
   C. BC
   D. 编译错误

正确答案是BC

`int[] arr = new int[1]` 只创建了索引 0 的位置，`arr[1] = 1` 访问的是不存在的索引，所以抛出的是 **`ArrayIndexOutOfBoundsException`**，而不是 `NullPointerException`。

### **** `NullPointerException` **是什么**

`NullPointerException`（NPE）是**对一个值为 `null` 的引用进行操作**时抛出的异常。比如：

```java
String s = null;
s.length(); // 空指针异常
```

 两者都属于 **`RuntimeException`**，也就是运行时异常，编译器不强制捕获。 

### **为什么** `catch (Exception e)` **能捕获到**

Java 异常体系大致是：

```java
Throwable
├── Error
└── Exception
    ├── RuntimeException
    │   ├── NullPointerException
    │   └── ArrayIndexOutOfBoundsException
    └── 其他 Exception（如 IOException）
```

`ArrayIndexOutOfBoundsException` 的继承链是：

```java
ArrayIndexOutOfBoundsException
→ IndexOutOfBoundsException
→ RuntimeException
→ Exception
→ Throwable
```

所以它确实是 `Exception` 的子类，能被 `catch (Exception e)` 捕获。

### **为什么** `catch (Exception e)` **写在前面会报错？**

注意：如果写成

```java
catch (Exception e) { ... }
catch (NullPointerException e) { ... }
```

就会编译报错，因为 `NullPointerException` 已经被前面的 `Exception` 覆盖，后面的 catch 永远进不去。

`NullPointerException` 是 `Exception` 的子类。也就是说，所有 `NullPointerException` 都已经是 `Exception`。

Java 的多重 catch 是**从上往下匹配**的：哪个 catch 先匹配上，就执行哪个，后面的 catch 全部跳过。

所以如果写成：

```java
catch (Exception e) { ... }
catch (NullPointerException e) { ... }
```

那么无论发生什么 `NullPointerException`，都会被第一个 `catch (Exception e)` 先接住。第二个 catch **永远没有机会执行**。

Java 编译器认为这种代码是**不可达代码**，也就是 dead code，所以编译阶段就会报错，提示类似：

编辑





```java
unreachable catch block
```

多重 catch 要遵循：

> **子类异常在前，父类异常在后。**

### **finally 呢？**

finally 和 catch 能不能进没有直接关系。

只要 try 或 catch 执行到了退出阶段，finally 通常都会执行，包括 try 里有 return 的情况。

但 finally 也不是绝对执行，比如：

- 调用了 `System.exit()`；
- JVM 崩溃；
- 进程被强制终止。

所以更准确地说：**finally 不是“无论如何都执行”，而是“只要 JVM 还在正常收尾，它通常都会执行”。**
