
.PHONY: all

all: raspi_scan_wlan

raspi_scan_wlan: src/raspi_scan_wlan
	mv -f $< $@
	sudo chown root:root $@
	sudo chmod u+s $@
