from setuptools import setup, find_packages

setup(
    name="eh-i-decoder",
    version="0.1.0",
    package_dir={"eh_i_decoder": "."},
    packages=["eh_i_decoder"],
    include_package_data=True,
    install_requires=[
        "aider-chat",
        "jrpc-oo",
        "GitPython",
    ],
    entry_points={
        "console_scripts": [
            "aider-server=eh_i_decoder.aider_server:main_starter",
        ],
    },
    python_requires=">=3.8",
)
