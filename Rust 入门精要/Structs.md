# Structs

## 语法

### 声明一个结构体

```rust
struct User {
    active: bool,
    username: String,
    email: String,
    sign_in_count: u64
}
```

### 初始化结构体：

```rust
fn main() {
    let user1 = User {
        active: true,
        username: String::from("someusername123"),
        email: String::from("someone@example.com"),
        sign_in_count: 1,
    };
}
```

如果结构体的key和值的变量名保持一致，则可以省略key。

```rust
fn build_user(email: String, username: String) -> User {
    User {
        active: true,
        username,
        email,
        sign_in_count: 1,
    }
}
```



### 根据结构体创建结构体

```rust
fn main() {
    // --snip--

    let user2 = User {
        email: String::from("another@example.com"),
        ..user1
    };
}
```

注意，由于user1被复制给了user2，所以user1的部分所有权转移到了user2中，那么user1被作为一个整体使用时，已经不再合法了。

对于上面的例子，此时user1只有 email, active, sign_in_count 这3个属性可用。

如果user2不使用user1的username，那么user1在赋值给user2后，整体依然是合法的，因为只有 active和sign_in_count通过 `Copy`特性传递给了 user2。



## 类Tuple的结构体

语法：

```rust
struct Color(i32, i32, i32);
struct Point(i32, i32, i32);

fn main() {
    let black = Color(0, 0, 0);
    let origin = Point(0, 0, 0);
}
```



# 类Unit的结构体

该结构体只有一个名字，没有任何的字段名。这通常用于你希望实现一些 `trait`但是却不包含任何数据的结构。

```rust
struct AlwaysEqual;

fn main() {
    let subject = AlwaysEqual;
}
```



上面的结构体中的字符串为什么不采用使用字符串的引用？

要使用引用必须要利用 `lifetimes`的特性，否则无法通过编译。



## Method

method与函数类似，简而言之：method就是定义在结构体中的函数，该函数的第一个参数永远是 `self`，`self`表示被调用的method结构体的实例本身。

语法：

```rust

#[derive(Debug)]
struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    fn area(&self) -> u32 {
        self.width * self.height
    }
    
}

fn main() {
    let r1 = Rectangle { width: 30, height: 50 };
    let s = r1.area();
    
}
```



## Associated Function

所有在 `impl`中的函数都被称为 `Associated Function`，我们可以定义一个第一个参数不是 `self`的函数。语法如下：

```rust
impl Rectangle {
    fn square(size: u32) -> Self {
        Self {
            width: size,
            height: size,
        }
    }
}

```

调用方式：`Rectangle::square(3)`

与 `method`不同的是，`method`是通过 `.`来调用，第一个参数不是`self`的`Associated Function`则是通过`::`来调用，这种方式也会用在采用了 `namespace`的函数中。