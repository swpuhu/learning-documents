# Shader从入门到放弃——FBM应用：BeautyPI

# 前言

今天为大家带来的是IQ大神（Inigo Quilez）在2013年的Shader作品，BeautyPI的代码讲解。

首先，我们先来看一下最终的效果。



这个Shader会使用到以下的技术：

1. 噪声
2. FBM（布朗分型运动）
3. warping/domain transforming

咱们今天主要就是加强对噪声和FBM的掌握。



话不多说，直接进入今天咱们的正题！



# 编码

首先是标准的起手式：

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 p = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
 	fragColor = vec4(1.0);   
}
```

接着，我们直接引入我们之前提及的噪声函数和FBM函数。如果你对噪声和FBM的知识还不够了解，你可以参考这篇文章：

```glsl

const mat2 m = mat2(0.80, 0.60, -0.60, 0.80);

float hash(float n) {
    return fract(sin(n) * 43758.5453);
}

float noise(in vec2 x) {
    vec2 i = floor(x);
    vec2 f = fract(x);

    f = f * f * (3.0 - 2.0 * f);

    float n = i.x + i.y * 57.0;

    return mix(mix(hash(n + 0.0), hash(n + 1.0), f.x), mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y);
}

float fbm(vec2 p) {
    float f = 0.0;
    f += 0.50000 * noise(p);
    p = m * p * 2.02;
    f += 0.25000 * noise(p);
    p = m * p * 2.03;
    f += 0.12500 * noise(p);
    p = m * p * 2.01;
    f += 0.06250 * noise(p);
    p = m * p * 2.04;
    f += 0.03125 * noise(p);
    return f / 0.984375;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 p = (2.0 * fragCoord - iResolution.xy) / iResolution.y;

    vec3 col = vec3(0.0, 0.3, 0.4);
    float f = fbm(5.0 * p);
    col = vec3(f);
    fragColor = vec4(col, 1.);
}
```

效果如下：

<img src="https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240512193730714.png" alt="image-20240512193730714" style="zoom: 33%;" />

如果你看到类似的图案说明你的代码正确！

接下来我们要开始造型了，先从一个圆开始吧！

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 p = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
    // polar coordinates
    float r = length(p);
    float a = atan(p.y, p.x);

    vec3 col = vec3(1.0);
    float f = fbm(5.0 * p);
    if(r < 0.8) {
        col = vec3(0.0, 0.3, 0.4);
        f = fbm(5.0 * p);
        col = mix(col, vec3(0.2, 0.5, 0.4), f);
    }

    fragColor = vec4(col, 1.0);
}
```

注意第11-12行的代码，我们使用了我们的fbm函数，得到了一个浮点数 `f`，我们再利用这个浮点数`f` 与另一个颜色值进行混合。结果如下：

<img src="https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240512200618473.png" alt="image-20240512200618473" style="zoom:33%;" />

接下来，我们给这个圆加上一点点缀。

```glsl
// yellow
f = 1.0 - smoothstep(0.2, 0.5, r);
col = mix(col, vec3(0.9, 0.6, 0.2), f);

// dark
f = smoothstep(0.2, 0.25, r);
col *= f;
```

结果如下：

<img src="https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240512201057056.png" alt="image-20240512201057056" style="zoom:33%;" />

我们再为其增加一些细节，比如加上径向的纹理试试？

```glsl
// white
f = fbm(vec2(r * 6., a * 20.0));
col = mix(col, vec3(1.), f);
```

注意，在上面的使用`fbm`函数的参数中，我们将坐标转换成了极坐标的形式。这样产生的噪声会呈现径向的方向。效果如下：

<img src="https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240512201410044.png" alt="image-20240512201410044" style="zoom:33%;" />

此时，我们觉得白色的部分有点扎眼了，我们想过滤掉一些比较小的值，这样看起来会好很多，我们可以使用`smoothstep`函数来完成。我们修改上面的代码如下：

```glsl
f = smoothstep(0.3, 1.0, fbm(vec2(r * 6., a * 20.0)));
col = mix(col, vec3(1.), f);
```

效果如下，这样看起来是不是好多了？

<img src="https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240512201537045.png" alt="image-20240512201537045" style="zoom:33%;" />

类似的，我们再增加一些黑色的噪声纹理以提升其”质感“

```glsl
f = smoothstep(0.3, 1.0, fbm(vec2(r * 10., a * 15.0)));
col = mix(col, vec3(0.), f * 0.5);
```

<img src="https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240512202100207.png" alt="image-20240512202100207" style="zoom:33%;" />

接下来，我们在图形的边缘添加一圈半透明的黑色吧。

```glsl
// edge
f = smoothstep(0.5, 0.8, r);
col *= 1.0 - f * 0.5;
```

<img src="https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240512202149775.png" alt="image-20240512202149775" style="zoom:33%;" />

Good ！ 至此，你已经完成了今天的大部分内容了。接下来我们又要见证奇迹的时刻了！

```glsl
a += fbm(20.0 * p) * 0.5;
```

我们在使用`a`变量前，加上这样一句代码。你可能会看到下面这样的效果

<img src="https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240512203213620.png" alt="image-20240512203213620" style="zoom:33%;" />

Cool，这看起来十分的花里胡哨，我们可以尝试把0.5的值稍微改小一点。这段代码是关于warping的，我这里提供一个技术链接，感兴趣的同学可以自行查阅相关的知识，今天我们这里就不过多展开了。

不过我还是可以简单的提及一下`warping`技术，这是一种常见的变换坐标系的技术，它与fbm结合起来，就可以得到这种十分魔幻但是又很好看的效果。

回归正题，我们把上面的0.5这个数值稍微改小一点。

<img src="https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240512203511057.png" alt="image-20240512203511057" style="zoom:33%;" />

嗯！这看起来更像是一个眼球了，我们可以尝试给其加上一点高光。

```glsl
f = 1.0 - smoothstep(0.0, 0.5, length(p - vec2(0.3, 0.2)));
col += vec3(1.0, 0.9, 0.8) * f * 0.7;
```

<img src="https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240512204043989.png" alt="image-20240512204043989" style="zoom:33%;" />

OK! We have done! 接下来，你还可以继续发挥你的创意，比如，给这幅图加上一点动效。



# 总结

今天，我们学习了FBM函数的具体应用，我们使用FBM技术和一丢丢的warping技术完成了这幅”眼睛“。

再次感谢IQ大神的视频和代码，如果你觉得本文对你有用，别忘了留下收藏和点赞~



IQ大神的原shader地址在此：



