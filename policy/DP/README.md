# DP

**Contributor:** RoboDojo Team | **Paper:** Diffusion Policy: Visuomotor Policy Learning via Action Diffusion | **arXiv:** https://arxiv.org/abs/2303.04137 | **Original code:** https://github.com/real-stanford/diffusion_policy

`DP` adapts Diffusion Policy (visuomotor policy learning via action diffusion) to XPolicyLab/RoboDojo. Integration scripts live at this directory level; the vendored upstream implementation lives in `diffusion_policy/`.

Shared conventions — argument meanings, checkpoint naming, split-machine deployment, `EVAL_ENV_TYPE` — are documented in the [XPolicyLab README](../../README.md). Official results: [RoboDojo LeaderBoard](https://robodojo-benchmark.com/LeaderBoard).

## Installation

```bash
cd XPolicyLab/policy/DP
bash install.sh
conda activate <policy_env>  # e.g. dp
```

### Docker

The same image contains the dependencies for data processing, training, and
policy-server inference. Build it locally from the repository root:

```bash
docker build -f policy/DP/Dockerfile -t xpolicylab-dp:local .
```

The GitHub Actions workflow publishes merged `main` builds to
`ghcr.io/soul667/xpolicylab-dp:latest`. To run the code baked into that image,
mount processed data and checkpoints at the paths used by the DP adapter:

```bash
docker run --rm -it --gpus all \
  -v "$PWD/data:/workspace/XPolicyLab/policy/DP/data" \
  -v "$PWD/checkpoints:/workspace/XPolicyLab/policy/DP/checkpoints" \
  ghcr.io/soul667/xpolicylab-dp:latest
```

Inside the container, the working directory is `policy/DP` and the `dp`
Conda environment is already on `PATH`. Run `process_data.sh` / `train.sh`
normally.

To test repository changes without rebuilding the image, bind mount the
checkout over the same path. The image uses editable installs rooted at
`/workspace/XPolicyLab`, so Python immediately imports the mounted code:

```bash
# Run from the XPolicyLab repository root.
docker run --rm -it --gpus all --shm-size=32g \
  -w /workspace/XPolicyLab/policy/DP \
  -v "$PWD:/workspace/XPolicyLab" \
  -v "/path/to/dp-data:/workspace/XPolicyLab/policy/DP/data" \
  -v "/path/to/dp-checkpoints:/workspace/XPolicyLab/policy/DP/checkpoints" \
  ghcr.io/soul667/xpolicylab-dp:latest
```

Mount raw RoboDojo/RoboTwin exports separately at `/workspace/data` when
running `process_data.sh`. For a standalone inference server, expose its
websocket port and pass `dp` as the policy environment:

```bash
docker run --rm --gpus all -p 8765:8765 \
  -v "$PWD/checkpoints:/workspace/XPolicyLab/policy/DP/checkpoints:ro" \
  ghcr.io/soul667/xpolicylab-dp:latest \
  bash setup_eval_policy_server.sh \
    RoboDojo stack_bowls cotrain arx_x5 joint 0 0 dp 8765 0.0.0.0
```

## Data Processing

Reads raw demos from `data/<bench_name>/<ckpt_name>/<env_cfg_type>` and produces the zarr dataset `data/<bench_name>-<ckpt_name>-<env_cfg_type>-<action_type>.zarr` consumed by `train.sh`. The only extra argument is the optional `[expert_data_num]` episode limit:

```bash
cd XPolicyLab/policy/DP
bash process_data.sh <bench_name> <ckpt_name> <env_cfg_type> <action_type> [expert_data_num]

# Example
bash process_data.sh RoboDojo stack_bowls arx_x5 joint

# Example: convert only the first 50 episodes from data/RoboDojo/stack_bowls/arx_x5
bash process_data.sh RoboDojo stack_bowls arx_x5 joint 50
```

## Training

```bash
cd XPolicyLab/policy/DP
bash train.sh <bench_name> <ckpt_name> <env_cfg_type> <action_type> <seed> <gpu_id>

# Example: train a cotrain run on GPU 0 (comma-separated gpu_id such as 0,1,2,3 if the upstream trainer supports it)
bash train.sh RoboDojo cotrain arx_x5 joint 0 0
```

Checkpoints land in `checkpoints/<bench_name>-<ckpt_name>-<env_cfg_type>-<action_type>-<seed>/`; at eval time `ckpt_name` may be the short run name (auto-combined into that directory name), the full run-directory name, or a path to a checkpoint directory. `train.sh` derives the action dimension from `env_cfg_type` (via `utils/get_action_dim.sh`) and expects the matching zarr dataset from `process_data.sh` under `data/`.

## Evaluation

```bash
cd XPolicyLab/policy/DP
bash eval.sh <bench_name> <task_name> <ckpt_name> <env_cfg_type> <action_type> <seed> \
  <policy_gpu_id> <env_gpu_id> <policy_conda_env> <eval_env_conda_env>

# Example: evaluate a trained cotrain checkpoint on stack_bowls
bash eval.sh RoboDojo stack_bowls RoboDojo-cotrain-arx_x5-joint-0 arx_x5 joint 0 0 0 <policy_conda_env> <eval_env_conda_env>
```

`EVAL_ENV_TYPE=debug` runs the offline wiring check (no simulator); leave it unset or set `EVAL_ENV_TYPE=sim` for RoboDojo simulation. For split-machine deployment via `setup_eval_policy_server.sh` / `setup_eval_env_client.sh`, follow the [Deployment Flow](../../README.md#-deployment-flow).

## Configuration

The default observation is multi-camera: `head_cam`, `left_cam`, and
`right_cam`, plus the low-dimensional `agent_pos`. Each camera uses its own
ResNet-18 because `share_rgb_model` defaults to `false`. `deploy.yml` keys to
check before evaluation: `checkpoint_num`.
