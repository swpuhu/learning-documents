# KNN算法



# 算法核心思想

- 距离决定一切
- K Nearest Neighbor



<img src="https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240130144152226.png" alt="image-20240130144152226" style="zoom: 33%;" />

## 小结

找到最近的K个邻居，在K个邻居中找到数量最多的种类，则该被预测的类型就是此类型。



# 如何选择K值



## K值过小

- 过拟合

- 容易受到噪声的影响

## K值过大

- 欠拟合
- 决策效率低



## 选择K值的方法

***超参数调参***



## 距离的度量

- 特征空间中的两点
  - 明氏距离(Minikowski Distance)
  - 曼哈顿距离(Manhattan Distance)
  - 欧式距离(Euclidean Distance)



## 特征归一化

