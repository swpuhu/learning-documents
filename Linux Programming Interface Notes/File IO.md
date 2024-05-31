# File I/O: The Universal I/O Model



所有需要执行I/O的系统调用指的是使用*文件描述符（file descriptor）*（通常是一个非负的整形数字）来打开文件。文件描述符用于表示打开文件的所有类型，包括 `pipes`, `FIFOs`, `sockets`, `terminals`, `devices`和常规的文件。



以下是4个最关键的系统调用函数用于执行文件I/O操作：

1. `fd = open(pathname, flags, mode)`
   - Flags 用于指定文件是可读还是可写，还是读写均可
   - mode用于指定该文件是不是应该被替换
2. `numread = read(fd, buffer, count)` 
   - `fd`指的是上面通过`open`打开文件后产生的文件描述符。
   - read函数会返回真正读取的**字节数**，如果没有更多的数据，或者说遇到了EOF，该函数会返回0.
3. `numwirteen = write(fd, buffer, count)` 该函数将写入`count`个字节到`fd`引用的文件中，`write`函数将返回真正写入的字节数，也就是说返回值可能比 `count`更小。
4. `status = close(fd)` 该函数应该在所有的 `I / O`操作完成后被调用，这是为了释放文件描述符 fd 和其相关的内核资源。



下面的程序是一个 `cp`命令的简单版本，它复制一个已知的文件内容到另一个新的文件中。

## 文件描述符与文件之间的关系 Relationship Between File Descriptors and Open Files

目前，文件描述符与文件之间看起来似乎是1v1的关系，但是多个文件描述符对应同一个文件也是可能的甚至是很有用的。这些文件描述符可以在同一个进程中打开也可以在不同进程中打开。

为了搞明白发生了什么，我们需要检查由内核维护的3个数据结构

- 每个进程的文件描述符表
- the system-wide table of open file descriptions
- file system i-node table



![image-20240520174927123](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240520174927123.png)

1. 情况一：进程A中的 `fd1`和`fd20`指向了同一个`open file description`，这种情况通常发生在调用了`dup`或 `fcntl`系统调用中。
2. 情况二：进程A的 `fd2`和进程B的 `fd2`指向了同一个 `open file description`，这种情况通常发生在调用了 `fork`之后（也就是说进程A是进程B的父亲，反之亦然），或者是其中一个进程通过 `UNIX domain socket`向另一个进程传递了一个描述符。
3. 情况三：进程A中的`fd0`和进程B中的 `fd3`虽然对应不同的  `open file description`，但是这2个摘要却指向了同一个`i-node`，换句话说，指向了同一个文件，这种情况通常发生在两个不同的进程打开了同一个文件时。



- 指向同一个文件的2个不同的文件描述符共享一个文件位置偏移值。因此，如果文件的偏移值被其中一个文件描述符修改（可能通过read, write 或 lseek造成），该变化同样会在另一个文件描述那也生效。这一规则不仅仅对同一进程下的2个文件描述符生效，对不同进程下的文件描述符也生效。
- 当通过 `fcntl`的 `F_GETFL`和 `F_SETFL`操作来查询和改变文件的status时，类似的规则也会应用。
- 相反，文件描述符的 flags则是私有的。修改这些`flags`则不会影响到另一边文件描述符的`flags`



## 可指定Offset的文件I/O File I/O at a Specified Offset: *pread()* and *pwrite()*

`pread` / `pwrite`与 `read`/`write`类似，不同的是`pread`/`pwrite`可以指定读写的位置，而不是通过文件的偏移位置来定位，在这多线程的程序中非常有用，这可以避免线程之间的竞争。并且，`pread`/`pwrite`比其执行2次系统调用的性能要好一些。



## 离散-聚合 I/O Scatter-Gather I/O: *readv()* and *writev()*

与之前读写只能写入一个buffer的数据不同，此方法允许将多个buffer中的内容通过一次系统调用写入到文件中。

```c
#include <sys/uio.h>

// struct iovec {
//  void *iov_base; /* Start address of buffer */
//  size_t iov_len; /* Number of bytes to transfer to/from buffer */
// };

ssize_t readv(int fd, const struct iovec *iov, int iovcnt);
	// Returns number of bytes read, 0 on EOF, or –1 on error
ssize_t writev(int fd, const struct iovec *iov, int iovcnt);
	// Returns number of bytes written, or –1 on error
```

与 `pread `/`pwrite`类似，同样也有 `preadv`和 `pwritev`



## 创建临时文件

此处临时文件的概念是：

仅在程序运行时存在，在程序结束后就被销毁。



创建临时文件的方法有：

- mkstemp(char *template)
  - 接受一个模板字符串，mkstemp会把字符串的后面6位进行替换，所以要**使用字符串数组，而不要使用字符串常量**
- FILE* tmpfile(void)