## Mysql练手题

###  1、查询 Java 课程成绩最高的前三名学生

```
数据表：
student(id, name, class_id)
score(id, student_id, course_name, grade)
```

 要求查询 Java 课程成绩最高的前三名学生的姓名和成绩，按成绩降序排列。
注意：先考虑普通的前三条记录；如果第三名存在并列，怎样让所有并列者也被返回？

```
SELECT 
    s.name,
    sc.grade
FROM 
    score sc
JOIN 
    student s ON sc.student_id = s.id
WHERE 
    sc.course_name = 'Java'
ORDER BY 
    sc.grade DESC
LIMIT 3;
```

### 2、 统计每门课程的平均成绩 

```
使用：
score(id, student_id, course_name, grade)
```

要求查询每门课程的平均成绩，只返回平均成绩大于或等于 80 分的课程，并按照平均成绩从高到低排序。

输出字段：course_name、avg_grade。

1. **`WHERE` 子句中不能使用聚合函数**：

   - **错误**：`WHERE avg(grade)>=80`
   - **原因**：`WHERE` 是在数据**分组之前**进行筛选的，而 `AVG()` 是在**分组之后**计算出来的。你无法在分组之前去筛选一个还不存在的分组平均值。
   - **修正**：在 SQL 中，**对分组后的聚合结果进行筛选，必须使用 `HAVING` 子句**。

```
SELECT 
    course_name,
    AVG(grade) AS avg_grade
FROM 
    score
GROUP BY 
    course_name
HAVING 
    AVG(grade) >= 80
ORDER BY 
    avg_grade DESC;
```



###  3、查询每个用户的最新一笔订单 

```sql
查询每个用户的最新一笔订单

数据表：
orders(id, user_id, amount, create_time)


要求查询每个用户最新的一笔订单，输出订单 ID、用户 ID、金额和下单时间。
注意：同一用户可能有多笔订单；如果下单时间相同，规定选择 id 最大的订单。
建议尝试使用 ROW_NUMBER() 窗口函数。
```

1、**`GROUP BY` 无法直接配合 `ORDER BY` 筛选“最新订单”**
`GROUP BY user_id` 的作用是将数据按用户分组，**每组只能返回一行聚合结果**（如 `COUNT()`、`SUM()` 等）。但你需要的是**每组中“最新”的那一行原始数据**（而非聚合结果），因此 `GROUP BY` 无法直接满足需求。
例如，`GROUP BY user_id` 后，数据库不知道应该取每组的哪一行（比如 `create_time` 最大的那一行），除非你使用聚合函数（如 `MAX(create_time)`），但这样会丢失其他字段（如 `id`、`amount`）。

2、 题目建议用 `ROW_NUMBER()`，这是解决“分组取Top N”问题的经典方法。核心逻辑是：
**按用户分组，对每组的订单按“下单时间降序、id降序”排序，取序号为1的行**（即最新订单，时间相同选id最大的）。 

窗口函数 `ROW_NUMBER()` 的作用是**为每个分组内的行分配一个唯一序号**（从1开始）。语法如下：

```
ROW_NUMBER() OVER (PARTITION BY 分组字段 ORDER BY 排序字段)
```

- `PARTITION BY user_id`：按用户分组，每个用户独立计算序号。
- `ORDER BY create_time DESC, id DESC`：排序规则——先按下单时间从晚到早（最新在前），时间相同则按id从大到小（id大的在前）。

3、思路：

 确实要用子查询 也确实是四个字段（如主select所要求） 只不过我们要对这个子查询的记录进行标号； 且是“分组内的排序取一个”不能用group by 即记录数不变，但排序按我们的要求来 而后where rn=1;会把每个分组删剩下 一条记录的； 

```sql
SELECT id, user_id, amount, create_time
FROM (
    SELECT 
        id, 
        user_id, 
        amount, 
    	create_time，
        ROW_NUMBER() OVER(PARTITION BY user_id ORDER BY create_time DESC, id DESC) AS rn
    FROM orders  -- 2. 别忘了写 FROM orders
) t              -- 3. 给子查询起个别名（比如 t）
WHERE rn = 1;    -- 4. 在最外层过滤 rn=1
```



> ROW_NUMBER() 是一个窗口函数。它的作用是给每一行数据打上一个“排名标签”。
>
> 在这个场景下，它的作用是：在每个用户的订单组内，按照时间先后给订单编号（1, 2, 3...）。
>
> PARTITION BY user_id          -- 【分组】：把数据按 user_id 切开，每个用户单独排队 ORDER BY create_time DESC, id DESC -- 【排序】：组内怎么排？
>
> 题目要求“最新的一笔”，所以外层只需要写： SELECT * FROM sub WHERE rn = 1; 这样就把所有 rn 不等于 1 的行过滤掉了，只留下了每个用户的第一名。
>

###  4、统计每个班级的学生人数及平均成绩 

1、题目要求“**包括没有任何成绩记录的学生所在班级**”。使用 `join`（即 `inner join`）会自动过滤掉没有成绩记录的学生和班级。必须使用 `left join` 以保留所有学生记录。

2、统计人数逻辑错误（违反注意项）

- 题目特别提醒“一个学生可能有多门课程的成绩，**不能因为连接成绩表而重复计算学生**”。
- 使用 `left join` 后，如果一个学生有 3 门成绩，该学生会在结果集中产生 3 行数据。此时直接使用 `count(id)` 会把该学生计算 3 次。
- 正确的做法是使用 `count(distinct s.id)` 来去重统计唯一的学生人数。

> .  COUNT(DISTINCT s.id)是什么意思？ 
>
> 1. **收集**：把所有属于该班级的 `s.id` 拿出来，比如列表是 `[101, 101, 101, 102, 103]`。
> 2. **去重 (DISTINCT)**：把重复的 ID 删掉，列表变成 `[101, 102, 103]`。
> 3. **计数 (COUNT)**：统计剩下的唯一 ID 个数，结果是 **3**。

```sql
SELECT 
    s.class_id,
    COUNT(s.id) AS student_count,      -- 因为已经是一对一连接，直接 count 即可
    AVG(t.student_avg) AS avg_grade     -- 对学生个人的平均分再求平均
FROM 
    student s
LEFT JOIN 
    -- 【这里是你的子查询】先算出每个学生的平均分
    (SELECT student_id, AVG(grade) AS student_avg 
     FROM score 
     GROUP BY student_id) t 
ON 
    s.id = t.student_id
GROUP BY 
    s.class_id;
    
    
 关于子查询，我的判断是先得到一个中间结果， 他可以是select, from 还是where之后的位置； 在这道题中，我们的学生表要关联另一张sc表；这是毋庸置疑的，但是我们希望对sc表现进行改造； 写代码的逻辑这部分先置为空；然后先写select，发现select要写的有： s.class_id, COUNT(DISTINCT s.id) AS student_count, AVG(sc.avg_grade) AS avg_grade 因为逻辑是对学生的平均成绩的平均；所以我们之前sc表那里就可以给出的字段包括这里要用到的sc.avg_grade，以及关联要用到的student_id 
```

###   5、要求查询 Java 课程成绩严格高于其所在班级 Java 课程平均成绩 的学生。 

有两张表：

```
student(
    id,
    name,
    class_id
)

score(
    id,
    student_id,
    course_name,
    grade
)
```

要求查询 Java 课程成绩严格高于其所在班级 Java 课程平均成绩 的学生。

```
select s.id,s.name,s.class_id
from student s
join score sc on s.id=sc.student_id  #先关联课程表
join (select 
st.class_id  as class_id，
avg(grade) as avg_grade 
from student st
join  score sc on st.id=sc.student_id
where sc.course_name='java'  #过滤剩下java这门课程
group by st.class_id)t  #这里得到了每个班的java平均成绩（再关联这张表)
on s.class_id=t.class_id
where sc.grade>t.avg_grade
```

因为学生表成绩表才有成绩，而班级平均分需要先算出来
 查询每个用户消费金额最高的两笔订单 

### 6、查询每个用户消费金额最高的两笔订单 

 中等 · ROW_NUMBER + 分组 Top N 

```
订单表：
orders(
    id,
    user_id,
    amount,
    create_time
)
```

实现：

```sql
SELECT id, user_id, amount
FROM (
    SELECT 
        id, 
        user_id, 
        amount, 
        create_time,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY amount DESC) AS rn  -- 修正语法和拼写
    FROM orders
) AS t
WHERE t.rn <= 2;  -- 修正筛选条件为前2条
```

