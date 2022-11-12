import puppeteer from "puppeteer";
import supabase from "../utils/supabase";

async function webScraper() {
  try {
    const browser = await puppeteer.launch({
      headless: false,
      executablePath: "/usr/bin/chromium-browser",
      defaultViewport: {
        width: 1920,
        height: 1080,
      },
    });

    const page = await browser.newPage();
    const allAddresses = [];

    for (let i = 1; i < 100; i++) {
      await page.goto(
        `https://bitinfocharts.com/top-100-richest-bitcoin-addresses-${i}.html`
      );
      const addresses = await page.evaluate(() => {
        const list = [];
        const items = document.querySelectorAll("tr");

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const bought = item.querySelector(
            "td.hidden-phone span.text-success"
          )?.innerHTML;
          const sold = item.querySelector(
            "td.hidden-phone span.text-error"
          )?.innerHTML;
          const exchange = item.querySelector("td small a")?.innerHTML;
          const address = item.querySelector("td a")?.innerHTML;

          list.push({
            bought: bought,
            sold: sold,
            address: address,
            exchange: exchange,
          });
        }

        return list;
      });

      allAddresses.push(addresses);
    }

    const addressesWithTransactions = allAddresses.flat().filter((address) => {
      return address.bought || address.sold;
    });

    const filteredAddressesWithTransactions = addressesWithTransactions.map(
      (address) => {
        // For sold and bought, we need to convert it to a number from '+1450 BTC' to 1450
        const bought = address.bought
            ? parseFloat(address.bought.replace("+", "").replace(" BTC", ""))
            : null,
          sold = address.sold
            ? parseFloat(address.sold.replace("-", "").replace(" BTC", ""))
            : null;

        return {
          address: address.address,
          bought,
          sold,
          exchange: address.exchange,
        };
      }
    );

    const result = await supabase
      .from("scraped_bitcoin_richlist")
      .insert(filteredAddressesWithTransactions);
    console.log(result);

    await browser.close();
  } catch (error) {
    console.log(error);
  }
}

export default webScraper;
