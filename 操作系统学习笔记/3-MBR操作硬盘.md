# 操作系统学习（三）—— MBR操作硬盘



利用端口来操作硬盘

所谓的“端口”，也理解为是一个内存地址



操作硬盘的步骤：

1. 先选择通道，往该通道的 `sector count` 寄存器中写入待操作的扇区数
1. 往该通道的三个LBA寄存器中写入扇区起始地址的低24位。
1. 往device寄存器中写入LBA地址的24~27位，并设置第6位为1（使其为LBA模式），设置第4位，选择操作的硬盘(master / slave)
1. 往该通道上的 `command` 寄存器写入操作命令（读/写/检测）
1. 读取该通道上的 `status`寄存器，判断硬盘工作是否完成
1. 如果以上步骤是读硬盘，进入下一个步骤，否则完工。
1. 将硬盘数据读出



![image-20231122191538822](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20231122191538822.png)

![img](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/1655693937!figure_largeshow.jpg)
