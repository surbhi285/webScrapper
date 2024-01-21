
const request = require('request-promise'); // used for making http request
const cheerio = require('cheerio'); // used for parsing HTML
const fs = require('fs'); // for interacting with file System
// const csv = require('json2csv').Parser;


/* scrapePage is an asynchoronus function that takes url as parameter for sending http request 
and with help oh cheerio parse html and extract laptop information from amazon. It iterate over each laptop
entry on the pages and extract information of different attributes and then extracted data is stored in an 
array and returned
*/
async function scrapePage(url) {
  let laptopData = [];

  const response = await request({
    uri: url,
    headers: {
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-US,en;q=0.9",
    },
    gzip: true
  });

  let $ = cheerio.load(response);

  $('div.a-section').each((element) => {
    let lappy = $(element);
    let Name = lappy.find('h2.a-size-mini.s-line-clamp-1').text();
    let TitleMatch = lappy.find('h2.a-size-mini.a-spacing-none.a-color-base.s-line-clamp-2').text().trim().match(/^(.*?,)/i);
    let Title = TitleMatch ? TitleMatch[1] : '';
    // let category = lappy.find('div#n-title span').text();
    let Description = lappy.find('h2.a-size-mini.a-spacing-none.a-color-base.s-line-clamp-2').text().trim();
    let MRP = lappy.find('span.a-offscreen').text();
    let Price = extractLastPrice(MRP);
    let sellingPrice = lappy.find('span.a-price-whole').text();
    let Discount = lappy.find('div.a-row.a-size-base.a-color-base span').last().text();
    let BrandName = lappy.find('h2.a-size-mini.s-line-clamp-1').text();
    let Image = lappy.find('img.s-image').attr('src');

    if (Name && Title && Description && Price && sellingPrice && Discount && BrandName && Image) {
      let data = { Name, Title, Description, Price, sellingPrice, Discount, BrandName, Image };
      laptopData.push(data);
    }
  });

  return laptopData;
}

/* scrapeAllPages is used to iterate over differnt pages i.e from start page to end page and it call 
scrapPage for each page, collects the results and concatenates them into single array . Here we are using 
delay of 2sec to avoid overloading the server */

async function scrapeAllPages(startPage, endPage) {
  let allLaptopData = [];

  for (let currentPage = startPage; currentPage <= endPage; currentPage++) {
    const pageUrl = `https://www.amazon.in/s?k=laptop&crid=1AQ9PSH4JKERK&sprefix=%2Caps%2C221&page=${currentPage}&ref=nb_sb_ss_recent_2_0_recent`;

    const pageData = await scrapePage(pageUrl);
    allLaptopData = allLaptopData.concat(pageData);

   
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return allLaptopData;
}

// here scrapped data is then formated into csv file by naming laptop.csv
(async () => {
  const startPage = 1;
  const endPage = 20; 

  const allLaptopData = await scrapeAllPages(startPage, endPage);

  // Convert the data to a CSV string
  
  const formattedData = allLaptopData.map(product => {
    return `Name: ${product.Name}\nTitle: ${product.Title}\nDescription: ${product.Description}\nMRP: ${product.Price}\nsellingPrice: ${product.sellingPrice}\nDiscount: ${product.Discount}\nBrandName: ${product.BrandName}\nImage: ${product.Image}\n\n`;
  }).join('\n');

  // Write the CSV file
  fs.writeFileSync("./laptop.csv", formattedData, "utf-8");
})();

// Function to extract the last price from a string
function extractLastPrice(priceString) {
  const regex = /₹(\d{1,3}(?:,\d{3})*$)/;
  const match = regex.exec(priceString);
  return match ? `₹${match[1]}` : null;
}

