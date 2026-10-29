## 对学生成绩进行排序

定义学生类 `Student`，包含 `id`、`name`、`score` 三个字段。

给定学生列表，按照以下规则排序：

1. 成绩从高到低。
2. 成绩相同时，学号从小到大。

```
(3, "张三", 90)
(1, "李四", 95)
(2, "王五", 90)

// 排序后：李四、王五、张三
```

要求：使用 `List` 和 `Comparator` 实现，不要手写排序算法。

```java
public class StudentDemo {
    static class Student{
         int id;
         String name;
         double score;

        public Student(int id, String name, double score) {
            this.id = id;
            this.name = name;
            this.score = score;
        }

        @Override
        public String toString() {
           return name;
        }
    }


    public static void main(String[] args) {
        // 可以在这里写简单的测试用例
        //定义一个Student集合
        List<Student> students = new ArrayList<>();
        students.add(new Student(3, "张三", 90));
        students.add(new Student(1, "李四", 95));
        students.add(new Student(2, "王五", 90));
        //排序前打印一下，使用集合的foreach方法
        System.out.println("排序前");
        students.forEach(s-> System.out.print(s+" "));

        //使用sort()排序，参数指定排序规则
        students.sort(Comparator.comparing((Student s)->s.score).reversed()
                .thenComparing(s->s.id));
        //排序后再打印一下
        System.out.println();
        System.out.println("排序后");
        students.forEach(s-> System.out.print(s+" "));


    }
}
```

## 