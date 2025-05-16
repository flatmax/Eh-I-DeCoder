from setuptools import setup, find_packages

setup(
    name="aider-server",
    version="0.1.0",
    packages=find_packages(),
    include_package_data=True,
    install_requires=[
        "aider-chat",
        # Add other dependencies as needed
    ],
    entry_points={
        "console_scripts": [
            "aider-server=python.aider_server:main_starter",
        ],
    },
    python_requires=">=3.7",
)
