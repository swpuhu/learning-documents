# Process

## Processes and Programs

**进程**是一个正常执行的程序的示例。

**程序**是一个文件，其中包含有在描述在运行时如何构建一个进程的信息。这些信息包含以下内容：

1. Binary format identification:

   每个程序文件都包含有元数据信息用于表述可执行文件的格式。这使得内核能够解释文件中的剩余信息。历史上，有2种常见的格式用于UNIX的可执行文件：`a.out`（assembler output）和 `COFF`(Common Object File Format)。如今，大部分的UNIX采用了ELF文件格式（Executable and Linking Format)，它比起历史上的那2种格式提供了许多优点。

2. Machine-language instructions: 编码后的程序算法
3. Program entry-point address: 表示了可执行程序应该从哪里开始
4. Data: 程序文件中包含的一系列用于初始化的变量和一些被程序使用的常量值
5. Symbol and relocation tables: 表述了程序中函数和变量的位置和名字，这些表被用于多种用途，包括调试和运行时的符号解析（动态链接）
6. Shared-library and dynamic-linking information: 程序文件中包含的一些字段，其中有程序在运行时需要使用的动态库和用于加载这些动态库的动态链接器的路径。
7. Other information: 程序文件中包含的其他信息用于描述如何创建一个进程



一个程序可以构建多个进程，或者反过来说，许多进程可以运行同一个程序。



## Process ID and Parent Process ID

每个进程都有一个ID

每个进程都有父进程，所以进程之间时一个“树状”结构。

但是以上的说话要除开进程ID为1的初始进程（init）。初始进程是所有进程的祖先。



当一个进程在运行的时候，其父进程被杀死，该进程的父进程则会变为初始进程。



## Memory Layout of Process

分配给每个进程的内存空间包含了许多部分，这些部分我们称之为“段（segment）”。这些“段”有以下部分：

1. text segment: 该段中包含了进程运行时使用的的程序机器码指令，该段是只读的以防止进程通过一些错误的指针不小心修改了自己的指令。由于许多进程可能会运行相同的程序，所以text段被设计为可共享的以便于一份程序的拷贝可以被映射到所有进程的虚拟内存空间中。
2. initialized data segment：包含了显示初始化的全局变量和静态变量。当程序被加载到内存中时，这些值就可以被读取了。
3. uninitialized data segment：包含了没有显示初始化的全局变量和静态变量。在程序开始之前，系统将该段中所有的内存空间都初始化为0。由于一些历史原因，这一段通常被称为`bss`段，这一名称来源于："block started by symbol"。使用该段的主要原因是：当一段程序存储在硬盘上时，为这些值分配空间是不必要的。但是需要记录其位置和大小，当程序运行起来时再为其分配空间。
4. stack：stack时一段能够动态增加和收缩的包含了“栈帧”的段。为每个被调用的函数分配的空间被称为“栈帧”。栈帧保存了函数的本地变量，函数参数和返回值。
5. heap: heap是一块能够在运行时动态分配的内存区域。heap结束的顶部被称为 `program break`



![image-20240521143034513](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240521143034513.png)



虚拟内存方案是将每个程序使用的内存分割为固定大小的小块，这个内存块我们称为“页”。对应的，物理内存也被分为相同大小的一系列的“页帧（page frame）”。



在任意时刻，一个程序中只需要某些页存在于物理内存页中，这些页被称为“*resident set*”。程序中未使用的页的拷贝会在一个叫做"*swap area*"的区域中被维护，这是硬盘中的保留区域，用于RAM的补充，仅在需要时才加载到物理内存中。

> 在x86-32架构中，页大小通常为4096字节（4KB）

![image-20240521174442352](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240521174442352.png)

## Allocating Memory on the Heap

