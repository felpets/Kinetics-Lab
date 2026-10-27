@echo off
if not exist build\classes mkdir build\classes
javac --add-modules jdk.httpserver -d build\classes src\*.java
if errorlevel 1 exit /b 1
java --add-modules jdk.httpserver -cp build\classes Main
