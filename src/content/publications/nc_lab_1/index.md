---
author: ["Rining Wu"]
title: "Aligning Neuronal Coding of Dynamic Visual Scenes with Foundation Vision Models"
slug: "aligning-neuronal-coding-of-dynamic-visual-scenes-with-foundation-vision-models"
# show in list page
summary: "Proposed Vi-ST demonstrates a novel modeling framework for neuronal coding of dynamic visual scenes in the brain, effectively aligning our brain representation of video with neuronal activity."
# show in single page
date: "2024-08-24"
tags: ["Neuronal Coding", "Natural Visual Scenes", "Vision Foundation Model"]
ShowToc: false
cover:
  image: ""
  alt: ""
  caption: "text caption"
  relative: false # To use relative path for cover image, used in hugo Page-bundles
  hidden: false
  responsiveImages: true
draft: false
---
Our brains represent the ever-changing environment with neurons in a highly dynamic fashion. The temporal features of visual pixels in dynamic natural scenes are entrapped in the neuronal responses of the retina. It is crucial to establish the intrinsic temporal relationship between visual pixels and neuronal responses. Recent foundation vision models have paved an advanced way of understanding image pixels. Yet, neuronal coding in the brain largely lacks a deep understanding of its alignment with pixels. Most previous studies employ static images or artificial videos derived from static images for emulating more real and complicated stimuli. Despite these simple scenarios effectively help to separate key factors influencing visual coding, complex temporal relationships receive no consideration.

{{< figure src="model_fig.jpg" width="90%" title="Vi-ST Model Arch." >}}

To decompose the temporal features of visual coding in natural scenes, here we propose **Vi-ST**, a **s**patio**t**emporal convolutional neural network fed with a self-supervised **Vi**sion Transformer (ViT) prior, aimed at unraveling the temporal-based encoding patterns of retinal neuronal populations. The model demonstrates robust predictive performance in generalization tests.

{{< figure src="ablation.jpg" width="75%" title="Ablation Study" >}}

Furthermore, through detailed ablation experiments, we demonstrate the significance of each temporal module.

{{< pre >}}
\begin{algorithm}
    \caption{Pseudocode of the SD-KL}
    \begin{algorithmic}
        \INPUT$\hat{y} \in \mathbb{R}^{N \times F}, y \in \mathbb{R}^{N \times F}, \alpha=0.3, \beta=1.0$
        \OUTPUT$\text{score}$
        % cut negative and high cut by \beta, calculate duration of spikes
        \STATE$\mathcal{\hat{D}} \gets \textbf{peak widths}(\min(\max(0, \hat{y}),\beta)), \mathcal{\hat{D}} \subset  \mathbb{R}$
        \STATE$\mathcal{D} \gets \textbf{peak widths}(\min(\max(0, y),\beta)), \mathcal{D} \subset \mathbb{R}$
        % calculate linear space, upper bound and lower bound of {D,D_hat}
        \STATE$Var_{\cup} \gets \frac{\alpha}{n}\sum_{i=1}^n{(x_i - \bar{x})^2}, x_i \in \{D,\hat{D}\}$
        % create a linear space
        \STATE$\mathcal{L}_{\cup} \gets \left\{(lower_{\cup}-3*Var_{\cup}) + i \cdot \frac{(upper_{\cup}+3*Var_{\cup}) - (lower_{\cup}-3*Var_{\cup})}{199} \mid i = 0, 1, \ldots, 199\right\}$
        % KDE for D and D_hat
        \STATE$pdf_{\mathcal{D}} \gets \textbf{KDE}(\mathcal{D}, \alpha)$
        \STATE$pdf_{\mathcal{\hat{D}}} \gets \textbf{KDE}(\mathcal{\hat{D}}, \alpha)$
        % sample KDE
        \STATE$P_{\mathcal{D}} = \left\{\left(x_i, \frac{pdf_{\mathcal{D}}(x_i)}{\sum_{j=1}^{N}pdf_{\mathcal{D}}(x_j)}\right) \mid x_i \in \mathcal{L}_{\cup}\right\}$
        \STATE$P_{\mathcal{\hat{D}}} = \left\{\left(x_i, \frac{pdf_{\mathcal{\hat{D}}}(x_i)}{\sum_{j=1}^{N}pdf_{\mathcal{\hat{D}}}(x_j)}\right) \mid x_i \in \mathcal{L}_{\cup}\right\}$
        % calculate KL divergence: P_{\mathcal{\hat{D}}} in P_{\mathcal{D}}
        \STATE$\text{score} \gets D_{KL}(P_{\mathcal{\hat{D}}}||P_{\mathcal{D}})$
        \STATE$\text{score} \gets \min(\max(0, \text{score}),1000)$
        \STATE\RETURN$\text{score}$
    \end{algorithmic}
\end{algorithm}
{{< /pre >}}

Furthermore, we introduce a visual coding evaluation metric, named **SD-KL** (Kullback-Leibler Divergence), designed to integrate temporal considerations and compare the impact of different numbers of neuronal populations on complementary coding.

In conclusion, our proposed Vi-ST demonstrates a novel modeling framework for neuronal coding of dynamic visual scenes in the brain, effectively aligning our brain representation of video with neuronal activity.

### Links

- [📃Paper](https://arxiv.org/abs/2407.10737)
- [💻Github Repo](https://github.com/wurining/Vi-ST)

---
