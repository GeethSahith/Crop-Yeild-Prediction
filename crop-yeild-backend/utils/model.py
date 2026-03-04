import torch
import torch.nn as nn
import torch.nn.functional as F


class ConvBlock(nn.Sequential):
    """
    CRITICAL:
    Must inherit from nn.Sequential directly.
    This matches checkpoint keys like:
        conv1.0.weight
        conv1.1.weight
    """

    def __init__(self, in_channels, out_channels, pool=False):
        layers = [
            nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
        ]

        if pool:
            layers.append(nn.MaxPool2d(2))

        super().__init__(*layers)


class ResNet9(nn.Module):
    def __init__(self, in_channels: int, num_classes: int):
        super().__init__()

        # Initial layers
        self.conv1 = ConvBlock(in_channels, 64)
        self.conv2 = ConvBlock(64, 128, pool=True)

        # Residual block 1
        self.res1 = nn.Sequential(
            ConvBlock(128, 128),
            ConvBlock(128, 128),
        )

        # Deeper layers
        self.conv3 = ConvBlock(128, 256, pool=True)
        self.conv4 = ConvBlock(256, 512, pool=True)

        # Residual block 2
        self.res2 = nn.Sequential(
            ConvBlock(512, 512),
            ConvBlock(512, 512),
        )

        # Classifier
        self.classifier = nn.Sequential(
            nn.AdaptiveMaxPool2d((1, 1)),
            nn.Flatten(),
            nn.Linear(512, num_classes),
        )

    def forward(self, x):
        out = self.conv1(x)
        out = self.conv2(out)

        out = self.res1(out) + out

        out = self.conv3(out)
        out = self.conv4(out)

        out = self.res2(out) + out

        out = self.classifier(out)
        return out