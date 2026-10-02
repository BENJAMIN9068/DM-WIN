import fs from 'fs';

let serveCode = fs.readFileSync('serve.mjs', 'utf8');

// 1. Update GetBannerList
const bannerHandler = `    // Banners
    if (endpoint.includes('GetBannerList') || endpoint.includes('GetBanner')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: [
          { bannerUrl: "/assets/png/banner-wccltQJr.png", url: "" },
          { bannerUrl: "/assets/png/MyCoinsBanner-DdbMZNYq.png", url: "" },
          { bannerUrl: "/assets/png/signInBanner-D5E7GDCc.png", url: "" }
        ]
      }));
      return;
    }`;

// 2. Update GetSiteMessageList
const siteMsgHandler = `    // Site Messages
    if (endpoint.includes('GetSiteMessageList') || endpoint.includes('GetSiteMessage')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          list: [
            { id: 1, title: "Welcome to DmFirst Games!", content: "Welcome to DmFirst! Play fair lottery and casino games with instant withdrawals." },
            { id: 2, title: "Deposit Bonus", content: "Top up ₹1,000 and get ₹28 extra instant bonus credited to your wallet!" }
          ],
          totalPage: 1,
          pageNo: 1
        }
      }));
      return;
    }`;

// 3. Update Balance / GetARGameAndPlatWallets
const balanceHandler = `    // GetBalance / GetAllwallets / GetARGameAndPlatWallets
    if (endpoint.includes('GetBalance') || endpoint.includes('GetAllwallets') || endpoint.includes('GetSaasAllwallets') || endpoint.includes('GetARGameAndPlatWallets')) {
      const user = users[currentActiveNumber] || { amount: 1250.00 };
      const bal = user.amount || 1250.00;
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          balance: bal,
          amount: bal,
          freezeBalance: 0,
          lotteryBalance: bal,
          totalBalance: bal,
          thidGameBalanceList: [
            { vendorCode: "Lottery", balance: bal }
          ]
        }
      }));
      return;
    }`;

// 4. Update GetGameCategoryList
const categoryHandler = `    // Game Category List with exact typeNameCode
    if (endpoint.includes('GetGameCategoryList') || endpoint.includes('GetLotteryCategoryList')) {
      const list = [
        { id: 1, categoryCode: "popular", typeNameCode: 9302, categoryName: "Popular", categoryImg: "/assets/png/popular-8_UUQbeo.png", sort: 1, state: 1 },
        { id: 2, categoryCode: "lottery", typeNameCode: 9301, categoryName: "Lottery", categoryImg: "/assets/png/lottery-Dbl-eMPh.png", sort: 2, state: 1 },
        { id: 3, categoryCode: "flash", typeNameCode: 9308, categoryName: "Mini games", categoryImg: "/assets/png/flash-DT4CLv66.png", sort: 3, state: 1 },
        { id: 4, categoryCode: "slot", typeNameCode: 9304, categoryName: "Slots", categoryImg: "/assets/png/slot-DM52Kkhg.png", sort: 4, state: 1 },
        { id: 5, categoryCode: "fish", typeNameCode: 9303, categoryName: "Fishing", categoryImg: "/assets/png/fish-D0liGLFa.png", sort: 5, state: 1 },
        { id: 6, categoryCode: "sport", typeNameCode: 9305, categoryName: "Sports", categoryImg: "/assets/png/sport-CFnl9BGk.png", sort: 6, state: 1 },
        { id: 7, categoryCode: "video", typeNameCode: 9306, categoryName: "Casino", categoryImg: "/assets/png/video-CepDEnWM.png", sort: 7, state: 1 },
        { id: 8, categoryCode: "chess", typeNameCode: 9307, categoryName: "PVC", categoryImg: "/assets/png/chess-Dg5bPKcx.png", sort: 8, state: 1 }
      ];
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: list,
        gameTypeList: list
      }));
      return;
    }`;

// 5. Add GetAllGameList
const allGamesHandler = `    // All Games List (for AllGames grid and sub-tabs)
    if (endpoint.includes('GetAllGameList')) {
      const lotteryGames = [
        { id: 1, categoryCode: "Win Go", categoryName: "Win Go", categoryImg: "/assets/png/game_bg-B4GOb9hW.png", sort: 1, state: 1 },
        { id: 2, categoryCode: "K3", categoryName: "K3 Lotre", categoryImg: "/assets/png/game_bg-B4GOb9hW.png", sort: 2, state: 1 },
        { id: 3, categoryCode: "5D", categoryName: "5D Lotre", categoryImg: "/assets/png/game_bg-B4GOb9hW.png", sort: 3, state: 1 },
        { id: 4, categoryCode: "Trx Win Go", categoryName: "TRX Win Go", categoryImg: "/assets/png/game_bg-B4GOb9hW.png", sort: 4, state: 1 }
      ];

      const slotGames = [
        { gameID: 101, slotsTypeID: 1, slotsName: "JILI", vendorCode: "JILI", vendorId: 1, img: "/assets/png/game_bg-B4GOb9hW.png", vendorImg: "/assets/png/game_bg-B4GOb9hW.png", winOdds: 98, state: 1 },
        { gameID: 102, slotsTypeID: 2, slotsName: "PG", vendorCode: "PG", vendorId: 2, img: "/assets/png/game_bg-B4GOb9hW.png", vendorImg: "/assets/png/game_bg-B4GOb9hW.png", winOdds: 96, state: 1 },
        { gameID: 103, slotsTypeID: 3, slotsName: "FC", vendorCode: "FC", vendorId: 3, img: "/assets/png/game_bg-B4GOb9hW.png", vendorImg: "/assets/png/game_bg-B4GOb9hW.png", winOdds: 95, state: 1 }
      ];

      const popularPlatforms = [
        { vendorId: 1, vendorCode: "JILI", slotsName: "JILI", imgUrl: "/assets/png/game_bg-B4GOb9hW.png", winOdds: 98, state: 1 },
        { vendorId: 2, vendorCode: "PG", slotsName: "PG", imgUrl: "/assets/png/game_bg-B4GOb9hW.png", winOdds: 97, state: 1 },
        { vendorId: 3, vendorCode: "ARLottery", slotsName: "Lottery", imgUrl: "/assets/png/game_bg-B4GOb9hW.png", winOdds: 99, state: 1 }
      ];

      const popularClicks = [
        { vendorId: 1, vendorCode: "JILI", slotsName: "Fortune Gems", imgUrl: "/assets/png/game_bg-B4GOb9hW.png", winOdds: 98, state: 1 },
        { vendorId: 2, vendorCode: "PG", slotsName: "Mahjong Ways", imgUrl: "/assets/png/game_bg-B4GOb9hW.png", winOdds: 97, state: 1 },
        { vendorId: 3, vendorCode: "JILI", slotsName: "Crazy 777", imgUrl: "/assets/png/game_bg-B4GOb9hW.png", winOdds: 95, state: 1 }
      ];

      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          popular: {
            platformList: popularPlatforms,
            clicksTopList: popularClicks
          },
          lottery: lotteryGames,
          slot: slotGames,
          sports: slotGames,
          casino: slotGames,
          video: slotGames,
          rummy: slotGames,
          chess: slotGames,
          fishing: slotGames,
          fish: slotGames,
          original: slotGames,
          flash: slotGames
        }
      }));
      return;
    }`;

// Replace in serve.mjs
// Replace Balance handler:
const origBalStart = serveCode.indexOf('    // GetBalance / GetAllwallets');
const origBalEnd = serveCode.indexOf('    // WinGo & Lottery Issues');
if (origBalStart !== -1 && origBalEnd !== -1) {
  serveCode = serveCode.substring(0, origBalStart) + balanceHandler + '\n\n' + serveCode.substring(origBalEnd);
}

// Replace Category handler and add AllGames, Banners, SiteMessages
const origCatStart = serveCode.indexOf('    // Game Category List');
const origCatEnd = serveCode.indexOf('    // Default universal success mock');
if (origCatStart !== -1 && origCatEnd !== -1) {
  serveCode = serveCode.substring(0, origCatStart) + categoryHandler + '\n\n' + allGamesHandler + '\n\n' + bannerHandler + '\n\n' + serveCode.substring(origCatEnd);
}

// Replace SiteMessage handler if present earlier
const origMsgStart = serveCode.indexOf('    // Site Messages');
const origMsgEnd = serveCode.indexOf('    // WinGo & Lottery Issues');
if (origMsgStart !== -1 && origMsgEnd !== -1) {
  serveCode = serveCode.substring(0, origMsgStart) + siteMsgHandler + '\n\n' + serveCode.substring(origMsgEnd);
}

fs.writeFileSync('serve.mjs', serveCode, 'utf8');
console.log('Updated serve.mjs with Banners, Categories, AllGames, and Balance!');
