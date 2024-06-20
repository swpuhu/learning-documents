

已知一图形变换过程为 $\bf M = \bf R \bf S$ 其中 $\bf M$ 表示最终变换矩阵，$\bf R$为旋转矩阵，$\bf S$为缩放矩阵。



旋转矩阵的表示
$$
\bf R = \begin{bmatrix}
\cos \theta & -\sin \theta \\
\sin \theta & \cos \theta
\end{bmatrix}
$$
缩放矩阵的表示
$$
\bf S = \begin{bmatrix}
S_x & 0 \\
0 & S_y
\end{bmatrix}
$$
则
$$
\bf R \bf S =
\begin{bmatrix}
S_x & 0 \\
0 & S_y
\end{bmatrix} 
\begin{bmatrix}
\cos \theta & -\sin \theta \\
\sin \theta & \cos \theta
\end{bmatrix} = 
\begin{bmatrix}
S_x\cos \theta & -S_x\sin \theta \\
S_y\sin \theta & S_y \cos \theta
\end{bmatrix}
$$




已知一图形$G$，当前状态的 旋转、缩放矩阵为是, $\bf R$, $\bf S$，现需要根据当前图形的位置进行水平翻转。



再乘以一个缩放矩阵则为：
$$
\begin{alignat*}{2}

\bf S’ \bf R \bf S &= 
\begin{bmatrix}
S_x' & 0 \\
0 & S_y'
\end{bmatrix}
\begin{bmatrix}
S_x\cos \theta & -S_x\sin \theta \\
S_y\sin \theta & S_y \cos \theta
\end{bmatrix} \\
& = 
\begin{bmatrix}
S_x'S_x\cos \theta & -S_x'S_x\sin \theta \\
S_y'S_y\sin \theta & S_y'S_y\cos \theta
\end{bmatrix}
\end{alignat*}
$$


相当于上面的 $\bf R \bf S$ 再乘以一个 $\bf R_2 \bf S_2$ 矩阵
$$
\bf R_2 \bf S_2 =
\begin{bmatrix}
S_{2x} & 0 \\
0 & S_{2y}
\end{bmatrix} 
\begin{bmatrix}
\cos \alpha & -\sin \alpha \\
\sin \alpha & \cos \alpha
\end{bmatrix} = 
\begin{bmatrix}
S_{2x}\cos \alpha & -S_{2x}\sin \alpha \\
S_{2y}\sin \alpha & S_{2y} \cos \alpha
\end{bmatrix}
$$



$$
\begin{bmatrix}
S_x'\cos \alpha & -S_x'\sin \alpha \\
S_y'\sin \alpha & S_y' \cos \alpha
\end{bmatrix}
\begin{bmatrix}
S_x\cos \theta & -S_x\sin \theta \\
S_y\sin \theta & S_y \cos \theta
\end{bmatrix}
 = 
\begin{bmatrix}
S_x'S_x\cos \alpha \cos \theta -S_x'S_y\sin \alpha\sin \theta & 
-S_x'S_x\cos\alpha \sin\theta - S_x'S_y\sin\alpha \cos\theta \\
S_y'S_x\sin\alpha \cos\theta + S_y'S_y\cos\alpha \sin\theta &
-S_y'S_x\sin\alpha \sin\theta + S_y'S_y\cos\alpha \cos\theta
\end{bmatrix}
$$
已知 
$$
\frac{S_x}{S_x'} = -1 或 1
$$
且
$$
\frac{S_y}{S_y'} = -1或1
$$


恒成立。



问：当 $S_x$与$S_x'$， $S_y$与 $S_y'$，$\alpha$与 $\theta$分别满足什么关系式，下列的等式恒成立？
$$
\begin{bmatrix}
S_x'S_x\cos \alpha \cos \theta -S_x'S_y\sin \alpha\sin \theta & 
-S_x'S_x\cos\alpha \sin\theta - S_x'S_y\sin\alpha \cos\theta \\
S_y'S_x\sin\alpha \cos\theta + S_y'S_y\cos\alpha \sin\theta &
-S_y'S_x\sin\alpha \sin\theta + S_y'S_y\cos\alpha \cos\theta
\end{bmatrix} =
\begin{bmatrix}
S_x'S_x\cos \theta & -S_x'S_x\sin \theta \\
S_y'S_y\sin \theta & S_y'S_y\cos \theta
\end{bmatrix}
$$
