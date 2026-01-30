#!/bin/bash
NAMESPACE="${1:-codebase_b1142_app}"
docker build -t "$NAMESPACE" .