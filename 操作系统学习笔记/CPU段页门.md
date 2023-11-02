# CPU段页门



什么是段？

代码段、数据段



什么是页？

虚拟内存，CPU分页机制



什么是门？

与用户态、内核态切换有关

四种门：中断门、调用门、任务门、陷进门

门的作用：

用于突破权限，从用户态切换到内核态

快速调用：

sysenter/sysexit, syscall/sysret



想要让CPU进入保护模式，必须构建”段“





# CPU 是如何找到数据并读写的？

内存地址：

1. 逻辑地址
   - 看到的所有的内存地址
2. 线性地址
   - 线性地址 = 段基址 + 逻辑地址
   - 线性地址 -> MMU -> 物理地址
     - 虚拟内存分页机制
3. 物理地址

​	物理内存的地址

![image-20231101154548656](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20231101154548656.png)

## CPU的运行模式（x64架构）

| 模式       | 位                                              |
| ---------- | ----------------------------------------------- |
| 实模式     | 16位                                            |
| 保护模式   | 32位                                            |
| 兼容模式   | 中间层，CPU进入64位模式后负责执行32位程序的模式 |
| 64位长模式 | 64位                                            |



段寄存器

cs			code segment 代码段

ss			stack segment 栈段	

ds			data segment 数据段

--------------------------------

不常用：

es

fs

gs



​		

​		

​	

CPU段部件是如何找到在内存中的数据段的？

GDT (Global Descriptor Table)	GDTR (Global Descriptor Table Register)

LDT (Local Descriptor Table)		LDTR (Local Descriptor Table Register)

CPL (Current Privilege Level)		当前请求特权级  (理解：CPL 不在物理上存在，理解为在CPU内存，CPL == RPL)

DPL (Descriptor Privilege Level)	访问段的最低要求特权级

RPL (Requested Privilege Level)	请求特权级



### 段选择子

![image.png](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/1664933044060-d8906cab-eeb2-4b9f-9844-50938b39de0c.png)

ds = 0x10时 代表的含义：

0x10 -> 0001_0000 ->

RPL = 0 只有内核才能访问

TI = 0, 去GDT表中查找

 Index = 2 使用GDT表中索引为2的描述符



CPU的 GDTR寄存器

x86: 6 Byte

​	gdt表的地址 	+ 	大小

​			4Byte				2 Byte



### 段描述符

![image.png](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/1664933163231-a737cebe-e875-45a9-9ee7-7240f0c8ee8a-20231101171249530.png)

1. 先检查P位， P == 1时才会继续，P == 0 表示无效段
2. 检查DPL
3. 检查S位
   - S == 0 表示系统段
   - S == 1 表示代码或数据段 --> 再检查 Type 来判断是代码段还是数据段

![204e0a93908b463cbfef65597813d694_1135275-20190930173435200-1337859686.png](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/1664933420354-50051636-2543-4038-b1cf-e13262b42d75.png)

4. 取base，limit
   1. 如果base + offset <= limit 





32位 段大小：0~4G，类型为代码段的描述符如下：

0000	0000	1100	1111	1001	1000	0000	0000

0000	0000	0000	0000	1111	1111	1111	1111