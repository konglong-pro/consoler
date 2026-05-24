from consoler_agent_sdk.server import JsonRpcServer

from .adapter import ConformanceFakeAdapter


def main() -> None:
    JsonRpcServer(ConformanceFakeAdapter()).run()


if __name__ == "__main__":
    main()
