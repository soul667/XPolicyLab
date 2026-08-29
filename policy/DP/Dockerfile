# syntax=docker/dockerfile:1.7
FROM continuumio/miniconda3:24.7.1-0

ARG TARGETARCH

LABEL org.opencontainers.image.title="XPolicyLab Diffusion Policy"
LABEL org.opencontainers.image.description="Training and inference environment for the XPolicyLab DP adapter"
LABEL org.opencontainers.image.source="https://github.com/soul667/XPolicyLab"

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    CONDA_DEFAULT_ENV=dp \
    PATH=/opt/conda/envs/dp/bin:/opt/conda/bin:${PATH}

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        bash \
        build-essential \
        ca-certificates \
        ffmpeg \
        git \
        libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/* \
    && conda create --yes --name dp python=3.10 pip=24.2 \
    && conda clean --all --yes

WORKDIR /workspace/XPolicyLab

COPY policy/DP/docker/requirements.txt /tmp/dp-requirements.txt

RUN python -m pip install \
        --index-url https://download.pytorch.org/whl/cu121 \
        torch==2.4.1 torchvision==0.19.1 \
    && python -m pip install -r /tmp/dp-requirements.txt

# Copy only the shared XPolicyLab runtime and the DP adapter. Other policy
# implementations are intentionally excluded from this image.
COPY pyproject.toml XPolicyLab.py __init__.py model_template.py setup_policy_server.py ./
COPY client_server ./client_server
COPY utils ./utils
COPY policy/__init__.py ./policy/__init__.py
COPY policy/DP ./policy/DP

RUN python -m pip install -e . \
    && python -m pip install -e policy/DP \
    && python - <<'PY'
import cv2
import diffusers
import hydra
import numba
import numpy
import torch
import torchvision
import zarr
from diffusion_policy.policy.diffusion_unet_image_policy import DiffusionUnetImagePolicy

assert torch.__version__.startswith("2.4.1")
assert numpy.__version__ == "1.23.5"
print("DP image smoke test passed")
PY

WORKDIR /workspace/XPolicyLab/policy/DP

VOLUME ["/workspace/XPolicyLab/data", "/workspace/XPolicyLab/checkpoints"]

CMD ["bash"]

