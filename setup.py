from setuptools import setup, find_packages

setup(
    name="solflu-simulation",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "numpy>=1.21.2",
        "pytest>=6.2.5",
        "pytest-benchmark>=4.0.0"
    ],
    author="SolFlu Team",
    description="Simulation engine for the SolFlu project",
    python_requires=">=3.8"
) 