# GLUEFILES

Glue multile files to one file

## Linux SEA builds

Linux single-executable builds are currently left uncompressed. UPX 5.3.0
rejects the ELF layout produced by Node.js SEA with `CantPackException: bad
e_phoff`; changing UPX compression algorithms or options does not resolve this
format limitation. An upstream UPX fix for non-adjacent ELF headers is being
worked on, but is not yet available in an official release:
[UPX issue #18935](https://github.com/upx/upx/issues/18935).
