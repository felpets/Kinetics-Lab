#!/usr/bin/env sh
set -eu
mkdir -p build/classes
javac --add-modules jdk.httpserver -d build/classes src/*.java
java --add-modules jdk.httpserver -cp build/classes ValidationTests
