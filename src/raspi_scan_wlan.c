#include <stdio.h>
#include <unistd.h>

int main(int argc, char *argv[]) {
    char *interface = "wlan0";
    if (argc >= 2) {
        interface = argv[1];
    }
    if (execl("/sbin/iw", "iw", "dev", interface, "scan", NULL) == -1) {
        printf("error executing iw\n");
        return 1;
    }
}
