# WebGL实战篇（十八）—— IBL之漫反射

# 前言

今天我们继续讲解PBR相关的内容，不过你会发现，咦，怎么标题变了，怎么叫做IBL之漫反射。IBL的全称是 “***Image Based Lighting***”基于图像的光照，这跟PBR又有什么关系呢？



在上面的章节中，我们实现了PBR材质中关于直接光照的部分。但是我们还没有解决PBR材质中关于环境光的部分，而IBL则是用于解决这一问题。只有完成了IBL的内容后，我们才能发挥出PBR材质的真正威力！



废话不多说，Let's get started!



我们还是先搬出这个复杂的***渲染方程***
$$
L_o(p,\omega_o) = \int_{\mathclap{\Omega}}{f_r(p, \omega_i, \omega_o)}{L_i(p,\omega_i)}{n \cdot \omega_i}d\omega_i
$$

我们将其展开：

$$
f_r = k_d\frac{c}{\pi} + k_sf_{cook-torrance} \\

L_o(p,\omega_o) = \int_{\mathclap{\Omega}}{(k_d\frac{c}{\pi} + k_sf_{cook-torrance})}{L_i(p,\omega_i)}{n \cdot \omega_i}d\omega_i
$$


通过***某一系列的假设***（这里涉及的理论过于复杂，不再展开），我们可以将上面的式子近似的等价于下面的式子：
$$
L_o(p,\omega_o) = \int_{\mathclap{\Omega}}{(k_d\frac{c}{\pi})}{L_i(p,\omega_i)}{n \cdot \omega_i}d\omega_i + \int_{\mathclap{\Omega}}{(k_sf_{cook-torrance})}{L_i(p,\omega_i)}{n \cdot \omega_i}d\omega_i
$$
我们将环境光其分为漫反射与镜面反射的两部分

$\int_{\mathclap{\Omega}}{(k_d\frac{c}{\pi})}{L_i(p,\omega_i)}{n \cdot \omega_i}d\omega_i$表示漫反射部分，$\int_{\mathclap{\Omega}}{(k_sf_{cook-torrance})}{L_i(p,\omega_i)}{n \cdot \omega_i}d\omega_i$表示镜面反射部分。今天我们主要讨论漫反射的部分。

仔细观察漫反射积分，我们发现漫反射兰伯特项是一个常数项（颜色 $c$、折射率 $k_d$ 和 $\pi$ 在整个积分是常数），不依赖于任何积分变量。基于此，我们可以将常数项移出漫反射积分：
$$
L_o(p,\omega_o) = k_d\frac{c}{\pi}\int_{\mathclap{\Omega}}{L_i(p,\omega_i)}{n \cdot \omega_i}d\omega_i
$$


上面的公式的含义是：

在点p处，出射光线的辐照度等于在该点半球方向内的入射环境光线的和乘以一个常数，再除以一个常数



上面的式子在半球范围内进行采样的话，可以得到 ：
$$
L_o(p,\phi_o, \theta_o) = k_d\frac{c}{\pi}\int_{\phi=0}^{2\pi}\int_{\theta=0}^{\frac{1}{2}\pi}{L_i(p,\phi_i, \theta_i)}\cos\theta \sin \theta d\phi d\theta \\
$$
转换为离散形式为：
$$
\begin{align}
L_o(p,\phi_o, \theta_o) =& k_d\frac{c}{\pi}\frac{1}{n1 \cdot n2} \sum_{\phi=0}^{n1}\sum_{\theta=0}^{n2}{L_i(p,\phi_i, \theta_i)}\cos\theta \sin \theta d\phi d\theta \\
=& k_d\frac{c}{\pi}\frac{2\pi}{n1} \frac{\pi}{2 \cdot n2} \sum_{m=0}^{n1}\sum_{n=0}^{n2}{L_i(p,\phi_m, \theta_n)}\cos\theta_n \sin \theta_n \\
=& k_d\frac{c\pi}{n1 \cdot n2} \sum_{m=0}^{n1}\sum_{n=0}^{n2}{L_i(p,\phi_m, \theta_n)}\cos\theta_n \sin \theta_n \\
\end{align}
$$






![img](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/ibl_hemisphere_sample.png)

转换为GLSL中代码如下：

```glsl
vec3 N = normalize(vWorldPosition);

vec3 irradiance = vec3(0.0);   

    // tangent space calculation from origin point
vec3 up = vec3(0.0, 1.0, 0.0);
vec3 right = normalize(cross(up, N));
up = normalize(cross(N, right));

float sampleDelta = 0.025;
float nrSamples = 0.0;
for(float phi = 0.0; phi < 2.0 * PI; phi += sampleDelta) {
    for(float theta = 0.0; theta < 0.5 * PI; theta += sampleDelta) {
            // spherical to cartesian (in tangent space)
        vec3 tangentSample = vec3(sin(theta) * cos(phi), sin(theta) * sin(phi), cos(theta));
            // tangent space to world
        vec3 sampleVec = tangentSample.x * right + tangentSample.y * up + tangentSample.z * N;
        vec4 texColor = textureCube(envMap, sampleVec);

        irradiance += texColor.rgb * cos(theta) * sin(theta);
        nrSamples++;
    }
}
irradiance = PI * irradiance * (1.0 / float(nrSamples));
```

上面的代码十分的简单，简单的来说，就是对半球方向上进行采样，$\theta$表示的是采样方向与y轴之间的夹角，$\phi$表示的是采样方向投影到xz平面上的向量与x轴的夹角。我们利用$\theta$与 $\phi$ 来对半球进行采样。



<img src="https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240122144834125.png" alt="image-20240122144834125" style="zoom:33%;" />

但是需要注意的是，我们进行采样的空间是在切线空间中，我们还需要将其转换到“世界空间”。因为我们对环境贴图采样时我们只需要***方向***即可，对环境贴图采样中我们不需要一个点的位置信息。

而 `vec3 sampleVec = tangentSample.x * right + tangentSample.y * up + tangentSample.z * N;` 等价于物体的旋转矩阵与切线空间的方向相乘得到“世界空间”下的方向。
$$

$$

$$
sampleVec = vec3( \\
	right.x * tangentSample.x + up.x * tangentSample.y + N.x * tangentSample.z, \\
	right.y * tangentSample.x + up.y * tangentSample.y + N.y * tangentSample.z, \\
	right.z * tangentSample.x + up.z * tangentSample.y + N.z * tangentSample.z)
$$

$$
\begin{bmatrix}
R_x & U_x & N_x \\
R_y & U_y & N_y \\
R_z & U_z & N_z \\
\end{bmatrix} 
\begin{bmatrix}
x \\
y \\
z \\
\end{bmatrix} = 
\begin{bmatrix}
R_xx + U_xy + N_xz \\
R_yx + U_yy + N_yz \\
R_zx + U_zy + N_zz \\
\end{bmatrix}
$$

可以看出上下的两个等式表示的意思是一样的。



我们按此方法对环境光照的每一个方向都进行此操作。最后可以得到一张“看起来被模糊的图”。如下所示

![img](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/ibl_irradiance.png)

上面说的可能过于抽象了，我们就直接进入代码环节吧，在编码中找到一点感觉。

# 编码

我们首先要显示一张背景图出来，并且应用上面的shader代码。对此，我们需要一个RenderTarget，并且使用`CubeTexture`来作为渲染目标。

我们先从加载一张环境贴图开始吧~

## 加载环境贴图

环境贴图一般来说是 hdr格式的。我们一般用的环境贴图会提供6张图片，但是我们常见的贴图可能是下面这样：

![image-20240122155606115](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240122155606115.png)

这类的环境贴图被称为***等距柱状投影图（Equirectangular Map)***。不过幸运的是，ThreeJS为我们提供了加载这类贴图的方法。我们可以创建一个临时的`CubeRenderTarget`，使用其`fromEquirectangularTexture`的API，将其转换为正常的 `CubeTexture`。



```typescript
const tempCubeRT = new THREE.WebGLCubeRenderTarget(cubeRTSize);
tempCubeRT.fromEquirectangularTexture(renderer, hdrTexture);
```



我们编写一个 `renderEnvMap`的函数用于渲染场景的环境。

```typescript

const renderEnvMap = () => {
    const tempCubeRT = new THREE.WebGLCubeRenderTarget(cubeRTSize);
    tempCubeRT.fromEquirectangularTexture(renderer, hdrTexture);
    scene.background = tempCubeRT.texture;
};
renderEnvMap();
```

如果渲染正确的话，我们可以得到以下的画面

![image-20240122161537038](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240122161537038.png)

接下来，我们基于已有的这个场景求每个方向上平均辐照度了，并且生成另一张环境贴图。在ThreeJS中，根据已有的环境生成环境贴图的方法是使用 `CubeCamera`，一般需要配合上 `WebGLCubeRenderTarget`一起使用。

```typescript
const cubeRT = new THREE.WebGLCubeRenderTarget(cubeRTSize);
const cubeCamera = new THREE.CubeCamera(near, far, cubeRT);
```

我们只需要调用 `cubeCamera.update` 的API，相当于相机就会朝6个方位分别渲染一张图片，并且将其保存为`CubeRenderTexture`。



由于我们要计算每个方向上的平均辐照度，这要求我们需要自己编写shader，但是THREEJS并没有提供自定义shader的背景，也就是说我们不能通过给 `scene.background` 赋值的方式来渲染背景了，我们需要自己实现一套逻辑，并且应用自定义shader。



我们编写一个`CustomBackground`来渲染背景，此处我翻阅了THREEJS的源代码，下面直接给出代码。

```typescript
import * as THREE from 'three';

export class CustomBackground {
    public mesh: THREE.Mesh;
    constructor(
        private vert: string,
        private frag: string,
        private name: string,
        private isSkyBox = true
    ) {
        this.mesh = this.__init();
    }

    private __init(): THREE.Mesh {
        const geo = new THREE.BoxGeometry(1, 1, 1);
        const mat = new THREE.ShaderMaterial({
            name: this.name,
            vertexShader: this.vert,
            fragmentShader: this.frag,
            uniforms: {
                envMap: { value: null },
                flipEnvMap: { value: -1 },
                backgroundBlurriness: { value: 0 },
                backgroundIntensity: { value: 1 },
                roughness: { value: 0 },
            },
            side: THREE.BackSide,
            depthTest: false,
            depthWrite: false,
            fog: false,
            defines: {
                ENVMAP_TYPE_CUBE: true,
            },
        });

        mat.uniformsNeedUpdate = true;
        const mesh = new THREE.Mesh(geo, mat);
        mesh.geometry.deleteAttribute('normal');
        mesh.geometry.deleteAttribute('uv');
        if (this.isSkyBox) {
            mesh.onBeforeRender = function (
                this: THREE.Mesh,
                _renderer,
                _scene,
                camera
            ) {
                this.matrixWorld.copyPosition(camera.matrixWorld);
            };
        }

        return mesh;
    }

    public setCubeTexture(texture: THREE.CubeTexture) {
        const mat = this.mesh.material as THREE.ShaderMaterial;
        mat.uniforms.envMap.value = texture;
    }

    public setRoughness(value: number) {
        const mat = this.mesh.material as THREE.ShaderMaterial;
        mat.uniforms.roughness.value = value;
        mat.needsUpdate = true;
    }
}

```

使用的顶点着色器代码与片段着色器的代码如下：

顶点着色器：

```glsl
varying vec3 vWorldDirection;
varying vec3 vWorldPosition;

#include <common>

void main() {

    vWorldDirection = transformDirection(position, modelMatrix);

	#include <begin_vertex>
	#include <project_vertex>

    vec4 worldPosition = (modelMatrix * vec4(position, 1.0));
    vWorldPosition = worldPosition.xyz;

    gl_Position.z = gl_Position.w; // set z to camera.far

}
```

片段着色器：

```glsl
#define PI 3.1415926
uniform samplerCube envMap;

uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
varying vec3 vWorldPosition;

varying vec3 vWorldDirection;

#include <cube_uv_reflection_fragment>

void main() {

    vec3 N = normalize(vWorldPosition);

    vec3 irradiance = vec3(0.0);   

        // tangent space calculation from origin point
    vec3 up = vec3(0.0, 1.0, 0.0);
    vec3 right = normalize(cross(up, N));
    up = normalize(cross(N, right));

    float sampleDelta = 0.025;
    float nrSamples = 0.0;
    for(float phi = 0.0; phi < 2.0 * PI; phi += sampleDelta) {
        for(float theta = 0.0; theta < 0.5 * PI; theta += sampleDelta) {
                // spherical to cartesian (in tangent space)
            vec3 tangentSample = vec3(sin(theta) * cos(phi), sin(theta) * sin(phi), cos(theta));
                // tangent space to world
            vec3 sampleVec = tangentSample.x * right + tangentSample.y * up + tangentSample.z * N;
            vec4 texColor = textureCube(envMap, sampleVec);

            irradiance += texColor.rgb * cos(theta) * sin(theta);
            nrSamples++;
        }
    }
    irradiance = PI * irradiance * (1.0 / float(nrSamples));

    gl_FragColor = vec4(irradiance, 1.0);

	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}
```



相应的，我们需要修改我们的ts代码：

```typescript
const cubeRT = new THREE.WebGLCubeRenderTarget(cubeRTSize);
const cubeCamera = new THREE.CubeCamera(near, far, cubeRT);
const renderEnvMap = () => {
    const customBackground = new CustomBackground(
        cubeMapVert,
        irradianceFrag,
        'customBg'
    );
    const renderIrradianceCubeScene = new Scene();
    renderIrradianceCubeScene.add(customBackground.mesh);
    const tempCubeRT = new THREE.WebGLCubeRenderTarget(cubeRTSize);
    tempCubeRT.fromEquirectangularTexture(renderer, hdrTexture);
    customBackground.setCubeTexture(tempCubeRT.texture);
    cubeCamera.update(renderer, renderIrradianceCubeScene);
    scene.background = cubeRT.texture;
};
```

如果渲染正确的话，你会看到下面的画面

![image-20240122163140219](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240122163140219.png)

我们可以看到背景变成很模糊的样子，这正是因为我们对每个方向都求了沿其法线方向的半球内的和的平均值。



但是你也可能看到这样的画面：

![image-20240122163258947](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240122163258947.png)

你可以看到有一些斑点状的光斑，这是因为`CubeRenderTexture`的尺寸设置的过大，而我们的采样精度不足导致的，一个比较好的解决方法就是将我们的纹理大小设置的小一点，这里我们设置的大小为64。



现在我们已经得到了环境光对于每个方向的平均辐照度的环境贴图了，现在我们只需要修改一下上节中的渲染PBR材质的代码，将这张贴图应用进去，参与到光照计算中即可。

首先，我们要为shader代码中添加一个环境贴图贴图：

```glsl
uniform samplerCube irradianceMap;
```



ambient 环境光也从常亮变成了以下的计算方法：

```glsl
// vec3 ambient = vec3(0.03);
vec3 ambient = texture(irradianceMap, N).rgb;
```

我们可以先输出一下环境光的颜色以检验代码的正确性，如果代码正确话，可以得到以下的结果：

![image-20240122182348059](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240122182348059.png)

但根据漫反射的公式来说，我们还需要考虑到 $k_d$项，所以

```glsl
vec3 kS = fresnelSchlick(max(dot(N, V), 0.0), F0);
vec3 kD = 1.0 - kS;
vec3 irradiance = texture(irradianceMap, N).rgb;
vec3 diffuse    = irradiance * albedo;
vec3 ambient    = (kD * diffuse) * ao; 
```

由于环境光来自半球内围绕法线 N 的所有方向，因此没有一个确定的半向量来计算菲涅耳效应。为了模拟菲涅耳效应，我们用法线和视线之间的夹角计算菲涅耳系数。然而，之前我们是以受粗糙度影响的微表面半向量作为菲涅耳公式的输入，但我们目前没有考虑任何粗糙度，表面的反射率总是会相对较高。间接光和直射光遵循相同的属性，因此我们期望较粗糙的表面在边缘反射较弱。

所以我们修正了 `freshnelSchlick`公式，修改如下：

```glsl
vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness)
{
    return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - cosTheta, 5.0);
}   
```

最终的结果如下：

![image-20240122182648764](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240122182648764.png)

# 总结

本文介绍了IBL中漫反射环境光计算的内容，其关键在于对环境贴图进行采样再求平均值，在最后的PBR光照计算中，获取之前获得的环境光辐照图，然后乘以$k_d$的值，再加上直接光照的结果就可以得到最终的结果了。



本项目的完整代码可以在此进行查看：[Three-PBR-direct - 码上掘金 (juejin.cn)](https://code.juejin.cn/pen/7325389918245486633)
