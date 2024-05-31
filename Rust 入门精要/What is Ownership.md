# 什么是Ownership

举一个🌰

```rust
    let s1 = String::from("hello");
    let s2 = s1;
```



Rust 程序在退出作用域时会清理当前作用域的变量。所以上述变量`s1`, `s2`在退出作用域时会被清理。

我们先看看字符串在内存中的布局

![image-20240528171029092](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240528171029092.png)

如果我们清理s1后，再清理s2，这相当于对同一块内存（ptr指向的内存空间）进行了释放，这会造成其他的Bug！

所以，在我们将`s1`赋值给`s2`时，Rust使`s1`变成非法的状态了，这样在释放内存空间时，我们就不会再释放`s1`中的指针的内存空间。这在rust中被称为`“move”`了。

**除了赋值操作，函数调用同样也会使字符串变得非法。**



除开字符串以外，实现了`Drop`特性的的数据结构都存在上述问题。

`Copy`特性与 `Drop`特性冲突。

实现`Copy`特性的数据结构在赋值时会在栈空间中被复制且储存。



实现了 `Copy`特性的数据结构有：

- u32, i32, f32, f64 等
- boolean
- char
- 只包含 `Copy`特性的数据结构的Tuple, 比如：(i32, i32)可以被Copy， 但是 (i32, String)则不行



## Return Values and Scope

返回值可以转移 `ownership`



变量的`ownership`始终遵循这样一种模式：

赋值给另一个变量时，ownership将转移。

当一个包含了heap中的数据的变量离开作用域时，其值将通过`drop`被清理，除非其`ownership`(下文中将翻译为“所有权”)转移到另一个变量上。



那么接下来发生的这件事会让人感觉有点蛋疼。因为一个值进入函数后，其所有权会发生转移，我们需要通过函数的返回值来转移所有权，如果我们还想继续使用传入到函数中的参数的话。

```rust
fn main() {
    let s1 = String::from("hello");

    let (s2, len) = calculate_length(s1);

    println!("The length of '{}' is {}.", s2, len);
}

fn calculate_length(s: String) -> (String, usize) {
    let length = s.len(); // len() returns the length of a String

    (s, length)
}
```



不过，Rust还提供了另一种解决方案，就是references



## References and Borrowing

> Reference 在下文中被翻译为“引用”

引用允许你在引用某个值的同时不使所有权发生转移。如下代码：

```rust
fn main() {
    let s1 = String::from("hello");

    let len = calculate_length(&s1);

    println!("The length of '{}' is {}.", s1, len);
}

fn calculate_length(s: &String) -> usize {
    s.len()
}
```



引用关系如下：

<img src="https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240528173313869.png" alt="image-20240528173313869"  />

`&s1`该语法可以让我们创建一个指代`s1`的值的引用，但是却不所有他（所有权不发生转移）。因为该引用对该值没有所有权，所以当该引用退出作用域时，`s1`并不会被`drop`清理。

类似的，函数签名中使用 `&`符号来表示其接受的参数类型是引用类型。



这种创建一个引用的行为我们称之为`borrowing`。就像在现实生活中一样，如果某个人拥有一样东西，你可以从他那接过来，当你使用完毕后，你需要还给他，毕竟你不真正拥有这样东西。

默认情况下，引用是不允许被修改的。



### Mutable References

语法：

```rust
fn main() {
    let mut s = String::from("hello");

    change(&mut s);
}

fn change(some_string: &mut String) {
    some_string.push_str(", world");
}
```



但是，可变的引用有一个约束条件：

如果一个值有了一个可变的引用，那么你不能再从这个值创建其他的引用了。如下面的例子就是错误的

```rust
    let mut s = String::from("hello");

    let r1 = &mut s;
    let r2 = &mut s;

    println!("{}, {}", r1, r2);
```

这是为了避免 "data race"的问题，这可能发生在下面这个情况中：

- 2个及其以上的真正同时访问同一个数据
- 至少有一个指针在写数据
- 且没有同步数据的机制

Rust通过上面的机制在编译时就可以组织data race的情况发生。

但是，下面的情况是允许的，因为第一个可变的引用已经退出了作用域，被清理了。

```rust
    let mut s = String::from("hello");

    {
        let r1 = &mut s;
    } // r1 goes out of scope here, so we can make a new reference with no problems.

    let r2 = &mut s;

```



## Slice Type

`Slice` 允许你引用集合中一段连续的元素，而不是整个集合。`slice`是一种引用，所以它没有所有权。



