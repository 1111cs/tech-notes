## 订单数据去重

给定一组订单，每条订单包含 `orderId`、`userId` 和 `amount`。数据中可能存在重复的 `orderId`。

规则：相同 `orderId` 只保留最后出现的那条记录，并保持保留记录在原始数据中的相对顺序。

```
输入：
(101, U1, 50)
(102, U2, 80)
(101, U1, 60)
(103, U3, 30)

预期结果：
(102, U2, 80)
(101, U1, 60)
(103, U3, 30)
```

要求：使用集合或 `Map` 实现，并解释如何确保保留顺序正确。

```java
class Order {
    private String orderId;
    private String userId;
    private int amount;

    public Order(String orderId, String userId, int amount) {
        this.orderId = orderId;
        this.userId = userId;
        this.amount = amount;
    }

    public String getOrderId() {
        return orderId;
    }

    public String getUserId() {
        return userId;
    }

    public int getAmount() {
        return amount;
    }

    @Override
    public boolean equals(Object o) {
        if (o == null || getClass() != o.getClass()) return false;
        Order order = (Order) o;
        return amount == order.amount && Objects.equals(orderId, order.orderId) && Objects.equals(userId, order.userId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(orderId, userId, amount);
    }
    @Override
    public String toString() {
        return "(" + orderId + ", " + userId + ", " + amount + ")";
    }

}

public class Test{
    public static List<Order> deduplicateOrders(List<Order> orders){
        //判断非空
        if(orders == null || orders.isEmpty()){
            return Collections.emptyList();
        }
        //创建一个HashMap来存储order对象，key是orderId,value是Order
        HashMap<String, Order> map = new HashMap<>();
        for(Order order:orders){
            //最后每个map存储的都会是该orderId对应的最后一个order实体
            map.put(order.getOrderId(),order);
        }
        //创建一个集合来存储结构
        List<Order> result = new ArrayList<>();
        for(Order order:orders){
            //判断当前order是否该orderId的最后一条记录
            if(map.get(order.getOrderId())==order){
                result.add(order);
            }
        }
        return result;
    }

    public static void main(String[] args) {
            List<Order> orders = Arrays.asList(
                    new Order("101", "U1", 50),
                    new Order("102", "U2", 80),
                    new Order("101", "U1", 60),
                    new Order("103", "U3", 30)
            );

            List<Order> deduplicated = deduplicateOrders(orders);
            for (Order order : deduplicated) {
                System.out.println(order);
            }
    }
}
```

### equals的函数架构

1、作用判断两个 Order 对象是否是同一个东西。

2、参数：Object o

说明：必须接收 Object 类型，这是因为 equals() 是继承自 java.lang.Object 的方法。为了保证所有类型（比如放到 HashMap 里）都能调用，参数必须是通用的 Object，然后我们在方法内部向下转型。

3、返回值（返回值）

boolean (true / false)

- `true`：表示这两个对象的字段完全一样，它们是“逻辑上的同一个对象”。
- `false`：表示它们不同。

```java
1、自反性判断（自己和自己比）
作用：性能优化。如果内存地址一模一样，绝对是同一个对象，直接返回 true，连后面拆包比较字段的步骤都省了。
2、空指针与类型防御
if (o == null || getClass() != o.getClass()) return false;
如果 o 是 null，任何对象都不等于 null，直接 false（避免后续拆包报空指针异常）。
如果 o 根本不是 Order 类（比如传进来一个 String 或 Student），直接 false。这里使用了严格匹配的 getClass() 而不是 instanceof，防止父子类比较的混乱。
3、向下转型
Order order = (Order) o;
把通用的 Object o 强转回具体的 Order 对象，这样才能访问它专属的 orderId 等字段。因为前面已经用 getClass() 校验过类型了，所以这里强转是 100% 安全的。
4、核心字段逐一比对
return amount == order.amount &&
       Objects.equals(orderId, order.orderId) &&
       Objects.equals(userId, order.userId);

```

```java
public class OrderDeduplication {

    public static List<Order> deduplicateOrders(List<Order> orders) {
        if (orders == null || orders.isEmpty()) {
            return Collections.emptyList();
        }

        // 1. 用 HashMap 记录每个 orderId 最后出现的订单对象
        Map<String, Order> lastOrderMap = new HashMap<>();
        for (Order order : orders) {
            lastOrderMap.put(order.getOrderId(), order); // 覆盖，最终保存的是最后一条
        }

        // 2. 按原始顺序筛选，保留那些是“最后出现”的订单
        List<Order> result = new ArrayList<>();
        for (Order order : orders) {
            // 判断当前 order 是否是该 orderId 的最后一条记录（引用相等）
            if (lastOrderMap.get(order.getOrderId()) == order) {
                result.add(order);
            }
        }

        return result;
    }

    public static void main(String[] args) {
        List<Order> orders = Arrays.asList(
                new Order("101", "U1", 50),
                new Order("102", "U2", 80),
                new Order("101", "U1", 60),
                new Order("103", "U3", 30)
        );

        List<Order> deduplicated = deduplicateOrders(orders);
        for (Order order : deduplicated) {
            System.out.println(order);
        }
    }
}
```

### hashcode()函数架构

1、作用：

将对象的多个字段（orderId, userId, amount）压缩成一个唯一的整数。

 这个整数主要用于在哈希表结构（如 HashMap、HashSet、Hashtable）中快速定位对象。

核心契约：如果两个对象通过 equals() 比较结果为 true，那么它们的 hashCode() 必须返回相同的整数。

2、参数

- **形式参数**：无显式参数列表 `()`。
- 隐式数据源：它使用了当前对象的三个成员变量作为计算因子：
  - `orderId` (String)
  - `userId` (String)
  - `amount` (double/int)

3、 返回值

类型：int (32位有符号整数)。 含义：代表当前对象内容的哈希摘要。

```java
@Override
    public int hashCode() {
        return Objects.hash(orderId, userId, amount);
    }
1）它没有手动去处理 String 的哈希算法和 int/double 的转换，而是直接丢给 java.util.Objects 工具类。
2）空指针安全：
Objects.hash(...) 内部会自动处理 null 值。如果 orderId 是 null，它不会报空指针异常，而是会将其视为 0 进行处理。这在手动编写哈希算法时很容易出错，但用这个工具类就完全规避了风险
3）组内算法：
它内部大致执行了类似这样的逻辑：
31 * (31 * (31 * 1 + hash(orderId)) + hash(userId)) + hash(amount)
通过乘以质数（通常是 31）并累加各个字段的哈希值，极大地降低了不同字段组合产生相同哈希值（即“哈希冲突”）的概率，从而保证集合的高效运行。
```

###   deduplicateOrders 函数架构

1、作用：对订单列表进行去重

规则是：如果存在多个 orderId 相同的订单，只保留最后一次出现的那一个，并且最终结果的排列顺序要和它们在原列表中出现的相对顺序保持一致。

2、参数：`List<Order> orders`，待处理的原始订单列表。

3、返回值：`List<Order>`，去重后的新订单列表。

4、 实现思路 

```
1）建立“最后出现”的映射

遍历原始列表，以 orderId 为 Key，Order 对象本身为 Value 存入 Map。 妙处：因为 Map 的 Key 是唯一的，当遇到相同的 orderId 时，后面的 put 操作会覆盖前面的。遍历结束后，Map 中每个 orderId 对应的 Value，必然是它在原始列表中最后一次出现的那个对象。

2）按原始顺序提取（筛选阶段）

再次遍历原始列表。对于每一个订单，去 Map 里查一下：“Map 里存的那个‘最后出现的订单’，是不是就是我当前手里拿的这个对象？” 妙处：这里使用了 == 进行引用比较（而不是 equals）。 如果当前对象就是 Map 里存的那个（即它是最后一次出现的），条件成立，加入结果集。 如果当前对象不是 Map 里存的那个（说明它后面还有同 ID 的订单，它被覆盖了），条件不成立，跳过
```

## 
