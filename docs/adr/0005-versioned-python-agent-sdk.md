# Versioned Python Agent SDK

The Python agent SDK will be released as the private/internal package `consoler-agent-sdk`, starting at SDK version `0.1.0`, while continuing to declare protocol compatibility separately from the package version. Build, metadata, install, and package smoke checks belong in the normal validation path, but package upload remains an explicit release action that reads repository URL and credentials from environment variables only; default CI must not upload packages or commit private package index details.
