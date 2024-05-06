# 大珠小珠落玉盘



跳跃的基本原理

硬编码跳跃

首先，我们先来看如何对一个小球的跳跃进行硬编码。我们想要的是一种函数，该函数根据时间`t`的变换可以求得当前小球的位置`h`。小球每次跳跃后弹起的高度都会发生衰减，我们可以比较自然的想到实用分段函数，如下：

![image-20240430154232251](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240430154232251.png)

这三个分段函数分别是：
$$
w_{1}=-4\left(x-0.5\right)\left(x+0.5\right) \\
w_{2}=-16\left(x-0.5\right)\left(x\ -0.75\right) \\
w_{3}=-7\left(x-1.0\right)\left(x\ -0.75\right)
$$
我们可以取这三个函数的max值来排除负数。$y = max(w_1, w_2, w_3)$。

基于此理论，我们可以编写出一个函数：

```glsl
float HardCodeBounce(float x) {
    float b1 = -4. * (x + .5) * (x - .5);
    float b2 = -16. * (x - .5) * (x - .8);
    float b3 = -7. * (x - .8) * (x - 1.);
    return max(b1, max(b2, b3));
}
```

效果如下：

![20240430-154746](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/20240430-154746.gif)