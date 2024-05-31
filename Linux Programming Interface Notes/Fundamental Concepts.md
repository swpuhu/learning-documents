# 基础概念



## Kernel执行的任务

- 进程调度（Process scheduling）
- 内存管理（Memory management）
- 提供文件系统（Provision of a file system）
- 创建和销毁进程（Creation and termination of process）
- 读写设备（Access for device）
- 网络（Networking）
- 提供系统调用API（Provision of a system call application programming interface）



## 内核态和用户态

现代指令集通常允许CPU以2种状态来执行指令：

1. 用户态 （user mode）
2. 内核态（kernel mode）



类似的，内存区域也被分为用户空间和内核空间。

- 处于用户态时，仅能访问用户空间，如果访问内核空间，则会报错
- 处于内核态时，可以访问用户空间和内核空间



## Shell

shell一种特殊的程序，用于接受用户的输入，并且运行相应的程序。



## File I/O Model

UNIX系统中一切皆为文件，无论是真正访问文件还是访问各类设备，我们都可以通过系统调用 `open`, `read`, `write`, `close`来进行操作。

另外，UNIX系统中，不存在EOF字符（End Of File）UNIX通过判断是否没有数据返回来决定是否到达一个文件的结尾。



### 文件描述符File Descriptor

***文件描述符***通常是一个非负的整形数字，通常是通过系统调用函数`open`产生的，I/O 系统通常使用文件描述符来打开一个文件。



一个进程通常会继承3个文件描述符

- 0号描述符：标准输入 *standard input*
- 1号描述符：标准输出 *standard output*
- 2号描述符：标准错误 *standard error*

在 `stdio`库中，这些描述符分别对应文件流`stdin`, `stdout` 和 `stderr`



### stdio 库

为了操作文件I/O，C程序通常会使用标准C语言库中的 I/O函数，这一系列函数通常被称为 `stdio`函数库，包含了 `fopen`, `fclose`, `scanf`, `printf`, `fgets`, `fput`等。这些`stdio`函数，在 I/O系统调用的上层(`open`, `close`, `read`, `write`等)。



### 过滤器 filters

filter是一类程序的名字，它从 `stdin`中接受数据，经过过滤后，输出数据到 `stdout`中。常见的过滤器有：`cat`, `grep`, `tr`, `sort`, `wc`, `sed`, `awk`



## 进程 Process

简单的说，进程就是一段正在运行中的程序实例。当一个程序执行时，内核会将程序代码加载进虚拟内存这种，并为其分配空间。

从内核的角度来看，进程是一段需要内核为其分享各种计算机资源的实体。对于有限的资源，比如内存，内核一开始会为进程分配一部分空间并且在整个进程的生命周期中调整其内存分配以满足进程的需求和整个系统对资源的需求。当进程结束时，所有的资源都应该被释放以便于其他进程再次使用。对于其他资源，例如CPU时间和网络贷款，必须在所有的进程中平均的分配。



### 进程内存布局 Process memory layout

一个进程再逻辑上被分为以下几部分：

- Text: 程序的指令
- Data: 被程序使用的静态变量
- Heap: 一段程序能够动态分配内存的区域
- Stack: 一段能够扩展和收缩的内存区域，当函数被调用时和函数返回时通常用于暂存本地变量和函数调用链接信息。

### 进程的创建和程序执行 Process creation and program execution

创建进程的2种方式：

1. fork

   使用 `fork`系统调用函数可以通过一个进程创建一个子进程

2. execute

​	`execute`系统调用可以加载并执行一个完整的新程序



### 进程ID和父进程ID Process ID and parent process ID

每个进程都有一个唯一的整形数字作为ID（*process identifier*) (***PID***)。

每个进程也都有一个 ***PPID*** (parent process identifier)属性



## 环境列表 Environment list

每个进程都有一个环境列表（Environment list），它存在于进程的用户空间内存区域中。列表中的每项都由一个name和相关的值组成。当进程通过`fork`创建时，环境列表会继承到子进程中。



在大多数的shell中，环境变量可以通过 `export`命令创建。例如：`$export MYVAR='Hello world'`



## 内存映射 Memory Mapping



## 系统数据类型 System Data Types

在不同的系统中，对于同一种数据有不同的表示方法，比如processID 等，在UNIX系统重可能是4字节，但是在另一种系统中可能是8字节的长度。

甚至在相同的系统，但是不是同一个版本中其数据类型也可能发生变化，比如在Linux2.2及其之前的版本中，groupID是用16位数据表示，而Linux2.4版本及以后则是使用了32位的数据来表示。



为了避免上面的这种情况，SUSv3定义了多种标准系统数据类型，比如说，我们应该使用 

`pid_t mypid` 来表示processID，而不要使用 `int mypid`



### 打印系统数据类型的值

通常使用 `%ld`来打印，类似于：

```c
pid_t mypid;
mypid = getpid();
printf("My PID is %ld\n", (long)mypid);
```

