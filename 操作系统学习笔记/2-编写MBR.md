# 操作系统学习（二）—— 编写MBR主引导记录



MBR （Main Boot Recorder)

MBR 加载流程如下

![image-20231122164354438](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20231122164354438.png)

简单的说就是将 0盘0道1扇区 512B的内容加载到内存中0x7c00地址处，这一过程是由BIOS例程自动帮助我们完成的。



现在我们可以编写一个大小为 512B的MBR程序，我们就在屏幕上打印一些字符吧。



```assembly
SECTION MBR vstart=0x7c00
    mov ax, cs
    mov ds, ax
    mov es, ax
    mov ss, ax
    mov fs, ax
    mov sp, 0x7c00

; 0x06 号功能，上卷全部行清屏
; INT 0x10 功能号： 0x06    功能描述：上卷窗口
;
; 输入
; AH 功能号 = 0x06
; AL = 上卷的行数（如果为0，则表示全部
; BH = 上卷的属性
; (CL, CH) = 窗口左上角的 (X, Y)的位置
; (DL, DH) = 窗口右下角的 (X, Y)的位置
; 无返回值

    mov ax, 0x600
    mov bx, 0x700
    mov cx, 0
    mov dx, 0x184f ;0x4f为低8位 == 80 ， 0x18为高8位 == 24
    ; VGA 文本模式中，一行只能容纳80个字符，一共25行。下标从0开始，
    int 0x10 ; 调用0x10中断
.get_cursor:
    mov ah, 3   ; 输入： 3号子功能是获取光标位置，存入AH寄存器
    mov bh, 0   ; bh 寄存器存储的是待获取光标的页号

    int 0x10    ; 输出： ch=光标开始行，cl=光标结束行

    ;获取光标位置结束
    
    mov ax, message
    mov bp, ax

    mov cx, 5
    mov ax, 0x1301

    mov bx, 0x2

    int 0x10
    ;; 打印结束

    jmp $ ; 让程序死循环在这里卡住

    message db "1 MBR"
    times 510 - ($ - $$) db 0
    db 0x55, 0xaa

```



上面的代码利用了 0x10 中断来进行打印字符串。



vstart=0x7c00 表示本程序在编译时，起始地址为0x7c00



$$ 表示的是 本section的其起始地址，$表示的是本行所在的地址



MBR的最后两字节是固定内容，必须是 0x55, 0xaa



上面程序编写完毕后，使用下列命令进行编译

```shell
nasm -o mbr.bin mbr.S
```



再使用下面的命令将 `mbr.bin`写入磁盘中：

```shell
dd if=./mbr.bin of=./hd60M.img bs=512 count=1 conv=notrunc
```



## 用显存文本模式打印字符

显存文本模式中，往内存地址 **0xb8000 **中写入字符串，可以在屏幕上打印字符。





## bochs调试常用命令



