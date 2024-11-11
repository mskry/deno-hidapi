import { hid } from "https://deno.land/x/deno_usbhidapi@v0.4.0/mod.ts";
import { parseArgs } from "@std/cli/parse-args";

const args = parseArgs(Deno.args, {
  string: ["vendor", "product"],
  default: { vendor: "", product: "" },
});

if (!args.vendor || !args.product) {
  console.error(
    "Usage: hid-listener --vendor=<vendorId> --product=<productId>",
  );
  console.error("Example: hid-listener --vendor=0x0483 --product=0x5740");
  Deno.exit(1);
}

const vendorId = parseInt(args.vendor);
const productId = parseInt(args.product);

if (isNaN(vendorId) || isNaN(productId)) {
  console.error(
    "Vendor ID and Product ID must be valid numbers (hex or decimal)",
  );
  Deno.exit(1);
}

async function main() {
  try {
    // Initialize HID API
    hid.init();
    console.log(
      `Looking for device with Vendor ID: 0x${
        vendorId.toString(16).padStart(4, "0")
      }, Product ID: 0x${productId.toString(16).padStart(4, "0")}`,
    );

    // Enumerate to check if device exists
    const devices = hid.enumerate(vendorId, productId);

    if (devices.length === 0) {
      console.error("No matching devices found");
      hid.exit();
      Deno.exit(1);
    }

    console.log("Found matching devices:");
    devices.forEach((device) => {
      console.log(
        `- ${device.manufacturer} ${device.product} (Serial: ${device.serial})`,
      );
    });

    // Open the device
    const device = hid.open(vendorId, productId);
    if (!device) {
      throw new Error("Failed to open device");
    }

    console.log("\nListening for messages... (Press Ctrl+C to exit)");

    // Continuous reading loop
    while (true) {
      try {
        // Read with a 64-byte buffer (adjust if your device uses a different packet size)
        const data = await hid.read(device, 64);

        // Only print if we received data
        if (data.some((byte) => byte !== 0)) {
          console.log("Received data:", new Date().toISOString());
          console.log(
            "Hex:",
            Array.from(data).map((b) => b.toString(16).padStart(2, "0")).join(
              " ",
            ),
          );
          console.log(
            "ASCII:",
            new TextDecoder().decode(data.filter((b) => b >= 32 && b <= 126)),
          );
          console.log("-".repeat(50));
        }
      } catch (error) {
        console.error("Error reading from device:", error);
        break;
      }
    }

    // Cleanup
    hid.close(device);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    hid.exit();
  }
}

main();
