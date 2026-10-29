### sort函数

```
default void sort(Comparator<? super E> c)
```

1、返回值是 void。 它不会返回一个新的 List，而是直接修改原来的 List

2、参数 `Comparator<? super E> c`

含义是：一个比较器，用来规定两个元素谁应该排在前面。

```java
students.sort( Comparator.comparing((Student s) -> s.score).reversed()              .thenComparing(s -> s.id) );
```

每次比较两个学生时，逻辑就是：

1. 先比 `score`，大的排前面；
2. 如果 `score` 相同，再比 `id`，小的排前面。

3、 `students.sort(comparator)` 的意思是：

> 把这个 List 转成数组，交给 TimSort 排序；排序过程中，每次比较两个元素都调用你传入的 `Comparator`，最后把排好序的结果写回原 List。

### foreach函数

```
students.forEach(s -> System.out.print(s + " "));
 这里的 `students` 是一个 `List` 集合（比如 `ArrayList`）。
```

我们知道，这个写法的作用相当于：对集合里的每个元素执行一次“打印”动作。

2、foreach方法介绍：**`forEach` 是定义在最顶层的 `Iterable`（可迭代）接口中的默认方法**。因为 `List` 继承了 `Iterable`，所以所有的集合（`ArrayList`、`HashSet` 等）都可以直接调用它。 

2、foreach参数本质：括号里传进去的是一个lambda表达式，相当于创建了一个匿名内部类；

**等价于 foreach 中传入一个函数式接口对象 `Consumer<Student>`**

3、函数封装要求：所有概念都搞清楚了之后，我们要知道的是students.forEach(...)参数中传入一个匿名内部类，之后会怎样的封装运行逻辑，我知道我不应该强行开盒，**只需要晓得其封装的参数类型要求就是一个匿名内部类，所以老老实实的写一个自定义需求的lambda表达式进去就行；** 

4、函数功能：

 `forEach` 的功能非常纯粹：**遍历集合中的每一个元素，并对每一个元素执行你指定的某个操作（Action）**。 

底层怎么把lambda表达式转换为这样的逻辑我就不深入研究了哈。

### **1、“有名的类”：常规操作**

假设我们有一个接口 `Animal`，里面有个方法 `speak()`。

```java
interface Animal {
    void speak();
}
```

如果我们想创建一个会“汪汪”叫的动物对象，最常规的做法是：**先建一个有名字的类**

```java
// 1. 定义一个有名字的类 Dog，实现 Animal 接口
class Dog implements Animal {
    @Override
    public void speak() {
        System.out.println("汪汪汪");
    }
}

public class Main {
    public static void main(String[] args) {
        // 2. 像平常一样，用 new 和 类名 创建对象
        Animal dog = new Dog(); 
        dog.speak();
    }
}
```

这就是“有名类”：它有自己的名字（`Dog`），是一个独立的 `.java` 文件或者一个独立定义的类，**可以被重复使用**。

### **2、匿名内部类：一次性、随用随写**

现在，假设你只需要一个**只会叫一声“喵”**的临时动物，以后再也不需要复用这个逻辑了。

你还要专门去建一个名字叫 `Cat` 的类吗？太麻烦了！

Java 允许你**在创建对象的瞬间，直接写出它的逻辑**，并且**不给它起名字**。这就是匿名内部类。

```java
public class Main {
    public static void main(String[] args) {
        // 直接在这里创建对象
        Animal cat = new Animal() { // 注意这里！直接在接口后面写了大括号
            @Override
            public void speak() {
                System.out.println("喵~~~");
            }
        };
        
        cat.speak();
    }
}
```

**仔细看 `new Animal() { ... }` 这一行：**

1. 它 `new` 了一个东西出来。
2. 它没有名字（没有 `class Cat`）。
3. 它直接在这个对象里实现了 `speak()` 方法。
4. 它被包在 `Main` 类里面，所以叫“内部”类。

**这相当于编译器在后台偷偷帮你做了这些操作：**

1. 自动生成一个随机的名字，比如 `Main$1`。
2. 让这个 `Main$1` 类去实现 `Animal` 接口。
3. 把大括号里的代码写进这个类里。

### **3、什么是函数式接口？**

函数式接口就是：**有且仅有一个抽象方法的接口**。

比如：

```java
@FunctionalInterface
interface MyAction {
    void run(String msg);
}
```

其中 `Consumer<T>` 就是 `java.util.function` 包里的一个函数式接口，表示“接收一个参数，但不返回结果”的操作。他的核心方法是：

```java
void accept(T t);
```

但他还有一个常用的默认方法：

```java
default Consumer<T> andThen(Consumer<? super T> after)
```

可以把两个消费动作串起来执行。

### 4、Lambda 表达式本质是什么？

Lambda的本质是：**函数式接口的一个匿名实例**。

比如：

```java
Consumer<String> c = s -> System.out.println(s);
```

底层可以理解为省略了匿名内部类：

```java
Consumer<String> c = new Consumer<String>() {
    @Override
    public void accept(String s) {
        System.out.println(s);
    }
};
```

所以 Lambda 能简化的前提是：**编译器知道你要实现哪个函数式接口的哪个抽象方法**。

### 5、Lambda表达式trick

#### **省略参数类型**

```java
(String s) -> s.length()
```

可以写成：

```java
s -> s.length()
```

因为编译器能从上下文推断类型。

#### **单参数省略括号**

```java
s -> s.length()
```

但多参数必须保留括号：

```java
(a, b) -> a + b
```

#### **单语句省略大括号和 return**

```java
s -> s.length()
```

等价于：

```java
s -> { return s.length(); }
```

但多语句时必须写 `{}`：

```java
s -> {
    System.out.println(s);
    return s.length();
}
```

#### **方法引用**

如果 Lambda 只是调用一个已有方法，可以进一步简化。

```java
s -> System.out.println(s)
```

可以写成：

```java
System.out::println
```

常见形式：

|           写法            |     含义     |
| :-----------------------: | :----------: |
| `ClassName::staticMethod` | 静态方法引用 |
|   `obj::instanceMethod`   | 实例方法引用 |
|     `ClassName::new`      |  构造器引用  |

比如：

```java
list.forEach(System.out::println);
```

#### **变量捕获限制**

Lambda 里使用局部变量时，这个变量必须是 **final 或 effectively final**，也就是赋值后不能再改。

```java
int factor = 2;
Function<Integer, Integer> f = x -> x * factor; // 可以
factor = 3; // 报错，factor 不再是 effectively final
```

### 

