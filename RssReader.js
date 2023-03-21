/* 对 prevFuncData 参数的解释 */
/* [函数名, [函数已接受的参数]] */

/* 测试项目 */
// [ok] 1. addSource, addMutiSource 函数中表单的功能
// [ok] 2. getRssFeedFromURL 函数中的错误处理：能否跳转到正确的表单
// [ok] 3. 输入不是链接，能否正确处理
// [ok] 4. 显示正确的数组或对象
// [unknown] 5. 为什么在输入完链接提交后会出现两个表单，一个undefined，一个正常的
// [ok] 6. html标签的处理(灰色)
// [notPlanned] 7. 在 mainMenu 函数中，当点击订阅源时，将订阅移到最前面
// [notPlanned] 8. 重命名订阅源
// [notPlanned] 9. 启动脚本时备份一次json文件
// [todo] 10. 多人游戏测试

// 命令注册
mc.regPlayerCmd("rss", "获取 RSS Feeds", mainMenu);

// 常量与全局变量
const { parse } = require('rss-to-json');
const playerDataPath = "plugins/RssReader/playerData.json";
const elementLabelMap = {
    title: "标题",
    description: "描述",
    created: "创建时间",
    published: "发布时间",
    link: "链接",
    content: "内容",
    category: "分类",
    enclosures: "附件",
    media: "媒体",
    id: "ID",
    author: "作者"
};
const defaultLabelFormat = "§7［§r %% §7］§r\n";
const defaultContentFormat = "%%";
const defaultIndent = 2;
const redFont = "§c";
const greenFont = "§a";
const grayFont = "§7";
const loadingDots = ["▁", "▂", "▃", "▄", "▄", "▅", "▅", "▆", "▆", "▇", "█", "█", "█", "█", "█", "▇", "▆", "▅", "▄", "▃", "▃", "▂", "▂", "▁", "▁", "▁"];
const itemCountLimit = 80;
let loadingDotsIndex = 0;
let timerIsUsing = 0;
let timerID = null;

// 界面函数
function mainMenu(pl, text) {
    let funcData = [Array.from(arguments), arguments.callee.name];
    let playerData = new JsonConfigFile(playerDataPath);
    let myData = playerData.get(pl.xuid); // log(myData + " " + typeof myData);
    if (myData == null) {
        myData = new Array();
        playerData.set(pl.xuid, myData);
    }
    if (text == null) text = "";
    let rssCount = myData.length;
    let content = `已添加 ${rssCount} 个订阅\n${text}`;

    let form = mc.newSimpleForm()
        .setTitle("RSS 订阅")
        .setContent(content)
        .addButton("§l＋§r [ 添加 RSS ]") // id: 0
        .addButton("§l⚒§r [ 管理 RSS ]"); // id: 1

    for (let i = 0; i < rssCount; i++) {
        form.addButton(myData[i]["title"]); // id: 2 ~ 2 + rssCount - 1
    }

    pl.sendForm(form, (pl, data) => {
        if (data != null) {
            switch (data) {
                case 0:
                    addSource(pl, "", "", funcData);
                    break;
                case 1:
                    manageRss(pl);
                    break;
                default:
                    getRssFeedFromURL(pl, myData[data - 2]["url"], (rss) => {
                        viewRss(pl, rss, data - 2, null, funcData);
                    }, funcData);
            }
        } else {

        }
    });
}

function manageRss(pl) {
    let form = mc.newSimpleForm()
        .setTitle("管理 RSS")
        .setContent(`管理 ${pl.realName} 的 RSS 订阅`)
        .addButton("§l<§r [ 返回 ]") // id: 0
        .addButton("§lｘ§r [ 删除 RSS ]") // id: 1
        .addButton("§l✍§r [ 修改 RSS 显示格式 ]"); // id: 2

    pl.sendForm(form, (pl, data) => {
        if (data != null) {
            switch (data) {
                case 0:
                    mainMenu(pl);
                    break;
                case 1:
                    // deleteSource(pl);
                    break;
                case 2:
                // modifyFormat(pl);
            }
        } else {
            mainMenu(pl);
        }
    });
}

function jumpToPage(prevFuncData) { // 跳转到指定页码，适用于 viewRss 函数
    if (prevFuncData[1] != "viewRss") return;
    let maxPage = Math.ceil(prevFuncData[0][1].items.length / itemCountLimit);
    let pl = prevFuncData[0][0];

    let form = mc.newCustomForm()
        .setTitle("页码跳转")
        .addSlider(`滑动下方滑块以选择将要跳转的页码\n\n页码`, 1, maxPage, 1, 1);

    pl.sendForm(form, (pl, data) => {
        if (data != null) {
            viewRss(pl, prevFuncData[0][1], prevFuncData[0][2], data[0], prevFuncData);
        } else {
            if (prevFuncData[1] == "viewRss") {
                viewRss(pl, prevFuncData[0][1], prevFuncData[0][2], prevFuncData[0][3], prevFuncData[0][4]);
            }
        }
    });
}

function viewRss(pl, rss, index, page, prevFuncData) {
    let funcData = [Array.from(arguments), arguments.callee.name];
    let playerData = new JsonConfigFile(playerDataPath);
    let myData = playerData.get(pl.xuid);
    let hel = myData[index]["hel"];
    let hef = myData[index]["hef"];
    let allContent = "";
    let form = mc.newSimpleForm()
        .setTitle(`${rss.title}`)
        .addButton("[ < 返回 ]"); // id: 0

    if (page == null) page = 1;
    let maxPage = Math.ceil(rss.items.length / itemCountLimit);
    if (page > maxPage) page = maxPage;
    let start = (page - 1) * itemCountLimit;
    let end = page * itemCountLimit;
    if (end > rss.items.length) end = rss.items.length;
    if (maxPage > 1) form.addButton(`[ 页码 ${page} / ${maxPage} ]`); // (id: 1)
    arguments[3] = page;
    for (let i = start; i < end; i++) {
        form.addButton(`${rss.items[i].title}`);
    }

    // 先判断hef[i]是否存在于排除列表hel中，再判断是否显示
    for (let i = 0; i < hef.length; i++) {
        elementName = hef[i][0];
        if (hel.indexOf(elementName) == -1) {
            // 获取配置
            showLabel = hef[i][1];
            labelFormat = hef[i][2];
            contentFormat = hef[i][3];
            if (showLabel == null) showLabel = 1;
            if (contentFormat == null) contentFormat = defaultContentFormat;

            content = rss[elementName];
            content = stringifyContent(content); // 将数组或对象转换为字符串
            if (elementName == "created" || elementName == "updated" || elementName == "published") { // 时间戳转换
                content = timestampToLocalString(content);
            }
            content = replaceBetweenPercentSigns(contentFormat, content);

            if (showLabel) {
                if (labelFormat == null) labelFormat = defaultLabelFormat;
                if (elementLabelMap[elementName]) elementName = elementLabelMap[elementName];
                label = replaceBetweenPercentSigns(labelFormat, elementName);
                allContent += label + content + "\n\n";
            } else {
                allContent += content + "\n\n";
            }
        }
    }
    form.setContent(allContent);

    pl.sendForm(form, (pl, data) => {
        if (data != null) {
            switch (data) {
                case 0:
                    mainMenu(pl, null);
                    break;
                default:
                    if (maxPage > 1) { // 存在"跳转页码"按钮
                        if (data == 1) {
                            jumpToPage(funcData);
                            return;
                        } else {
                            viewRssItem(pl, rss.items[start + data - 2], funcData);
                        }
                    } else {
                        viewRssItem(pl, rss.items[start + data - 1], funcData);
                    }
            }
        } else {
            mainMenu(pl, null);
        }
    });
}

function viewRssItem(pl, item, prevFuncData) {
    let form = mc.newCustomForm()
        .setTitle(prevFuncData[0][1].title + " - 详细内容")

    // 根据json文件中的设置来显示内容
    let playerData = new JsonConfigFile(playerDataPath);
    let myData = playerData.get(pl.xuid);
    let index = prevFuncData[0][2];
    let iel = myData[index]["iel"];
    let itf = myData[index]["itf"];
    let elementName, showLabel, labelFormat, contentFormat, label, content;

    // 先判断itf[i]是否存在于排除列表iel中，再判断是否显示
    for (let i = 0; i < itf.length; i++) {
        elementName = itf[i][0];
        if (iel.indexOf(elementName) == -1) {
            // 获取配置
            showLabel = itf[i][1];
            labelFormat = itf[i][2];
            contentFormat = itf[i][3];
            if (showLabel == null) showLabel = 1;
            if (contentFormat == null) contentFormat = defaultContentFormat;

            content = item[elementName];
            content = stringifyContent(content);
            if (elementName == "created" || elementName == "updated" || elementName == "published") {
                content = timestampToLocalString(content);
            }
            content = replaceBetweenPercentSigns(contentFormat, content);

            if (showLabel) {
                if (labelFormat == null) labelFormat = defaultLabelFormat;
                if (elementLabelMap[elementName]) elementName = elementLabelMap[elementName];
                label = replaceBetweenPercentSigns(labelFormat, elementName);
                form.addLabel(label + content);
            } else {
                form.addLabel(content);
            }
        }
    }

    pl.sendForm(form, (pl, data) => {
        viewRss(pl, prevFuncData[0][1], index, prevFuncData[0][3], prevFuncData);
    });
}

function addSource(pl, label, inputedText, prevFuncData) {
    // label: 提示信息 | inputedText: 输入框中的文本

    if (valueNotProvided(label)) label = arguments[1] = "";
    if (valueNotProvided(inputedText)) inputedText = arguments[2] = "";
    if (valueNotProvided(prevFuncData)) prevFuncData = arguments[3] = new Array();

    let form = mc.newCustomForm()
        .setTitle("添加 RSS")    // testURL: https://www.minebbs.com/forums/-/index.rss
        .addInput("在下面文本框中输入RSS地址", "链接过长？输入§l0§r然后点击“提交”按钮来分段输入", inputedText) // id: 0
        .addLabel(label);

    pl.sendForm(form, (pl, data) => {
        if (data != null) {
            inputedText = data[0];
            let funcData = [Array.from(arguments), arguments.callee.name];
            if (data[0] == "0") {
                selectInputCount(pl, funcData);
            } else if (isBlank(data[0])) {
                addSource(pl, "§c请输入RSS地址", "", prevFuncData);
            } else {
                var rss;
                getRssFeedFromURL(pl, data[0], (rss) => {
                    addSource(pl, '成功: ' + rss.title, data[0], funcData);
                    saveToFile(pl.xuid, rss, data[0]);
                }, funcData);
            }
        } else {
            mainMenu(pl);
        }
    });
}

function selectInputCount(pl, prevFuncData) {
    let form = mc.newCustomForm()
        .setTitle("自定义输入框数量")
        .addSlider("输入框数量", 2, 20, 1, 1); // id: 0

    pl.sendForm(form, (pl, data) => {
        if (data != null) {
            addMutiSource(pl, "", data[0], "", prevFuncData);
        } else {
            // todo: 玩家关闭了表单, 返回上一级
            if (prevFuncData[1] == "addSource") {
                addSource(pl, prevFuncData[0][1], prevFuncData[0][2], prevFuncData[0][3]);
            }
        }
    });
}

function addMutiSource(pl, label, inputCount, inputedText, prevFuncData) {
    // label: 提示信息 | inputCount: 文本框数量 | inputedText: [数组]输入框中的文本

    if (valueNotProvided(label)) label = arguments[1] = "";
    if (valueNotProvided(inputCount)) inputCount = arguments[2] = 2;
    if (valueNotProvided(inputedText)) {
        inputedText = arguments[3] = new Array(inputCount);
        for (let i = 0; i < inputCount; i++) {
            inputedText[i] = "";
        }
    }
    if (valueNotProvided(prevFuncData)) prevFuncData = arguments[4] = new Array();

    let form = mc.newCustomForm()
        .setTitle("添加 RSS")
        .addLabel("请在下面的输入框中分段输入 RSS 地址，每个输入框最多输入 §l100§r 个字符。"); // id: 0

    for (let i = 1; i <= inputCount; i++) {
        form.addInput(`${grayFont}[${i}]`, `第 ${i} 段`, inputedText[i - 1]); // id: 1 ~ inputCount
    }

    form.addLabel(label);

    pl.sendForm(form, (pl, data) => {    // testURL: https://www.minebbs.com/forums/-/index.rss
        if (data != null) {
            let rss, url = "";
            for (let i = 1; i <= inputCount; i++) {
                url += data[i];
            }
            if (!isBlank(url)) {
                for (let i = 1; i <= inputCount; i++) {
                    inputedText[i - 1] = data[i];
                }
                let funcData = [Array.from(arguments), arguments.callee.name];
                getRssFeedFromURL(pl, url, (rss) => {
                    addMutiSource(pl, '成功: ' + rss.title, inputCount, inputedText, funcData);
                    saveToFile(pl.xuid, rss, url);
                }, funcData);
            } else {
                addMutiSource(pl, "§c请输入RSS地址", inputCount, inputedText, prevFuncData);
            }
        } else {
            mainMenu(pl);
        }
    });
}

// 功能函数
async function getRssFeedFromURL(pl, url, callback, prevFuncData) {
    try {
        pl.addTag("isGettingRss"); // log("[138] Tag added: isGettingRss");
        enableTimer(); // log("[139] Timer enabled");
        timerIsUsing++;
        let rss = await parse(url);
        if (isOnline(pl)) callback(rss); // 如果玩家还在线, 则执行回调函数
        timerIsUsing--;
        disableTimer(); // log("[144] Timer disabled");
        pl.removeTag("isGettingRss"); // log("[145] Tag removed: isGettingRss");
    } catch (err) {
        timerIsUsing--; // log(err);
        disableTimer(); // log("[150] Timer disabled" + "timerIsUsing: " + timerIsUsing);
        pl.removeTag("isGettingRss"); // log("[151] Tag removed: isGettingRss");
        if (prevFuncData[1] == "addSource") {
            addSource(pl, '获取 RSS 时发生错误: ' + redFont + err.code, prevFuncData[0][2], prevFuncData);
        } else if (prevFuncData[1] == "addMutiSource") {
            addMutiSource(pl, '获取 RSS 时发生错误: ' + redFont + err.code, prevFuncData[0][2], prevFuncData[0][3], prevFuncData);
        } else if (prevFuncData[1] == "mainMenu") {
            mainMenu(pl, '\n获取 RSS 时发生错误: ' + redFont + err.code, prevFuncData);
        }
    }
}

function isOnline(pl) {
    let onlinePlayers = mc.getOnlinePlayers();
    for (let i = 0; i < onlinePlayers.length; i++) {
        if (onlinePlayers[i].xuid == pl.xuid) return true;
    }
    return false;
}

function saveToFile(xuid, rss, url) {
    let playerData = new JsonConfigFile(playerDataPath);
    let myData = playerData.get(xuid);
    if (myData == null) myData = new Array();
    let rssCount = myData.length;
    let rssIndex = -1;

    for (let i = 0; i < rssCount; i++) { // 遍历myData数组，寻找是否已经存在该RSS
        if (myData[i]["url"] == url) {
            rssIndex = i;
            break;
        }
    }

    if (rssIndex != -1) { // 存在该订阅时仅更新标题
        if (myData[rssIndex]["title"] != rss.title) myData[rssIndex]["title"] = rss.title;
    } else {
        let hel = new Array(); // hel: 头部元素排除列表
        let iel = new Array(); // iel: Items元素排除列表
        let hef = new Array(); // hef: 头部元素显示格式
        let itf = new Array(); // itf: Items元素显示格式

        for (let key in rss) {
            if (key != "description") {
                hel.push(key);
            } else {
                let showLabel = 1;
                let labelFormat = null; // null: 使用默认格式
                let contentFormat = null;
                if (key == "title" || key == "description") showLabel = 0;
                if (key == "title") contentFormat = "§l%%§r";

                hef.push([key, showLabel, labelFormat, contentFormat]);
            }
        }

        let rssItems = rss["items"][0]; // log("rssItems: " + rssItems);
        for (let key in rssItems) {
            if (key != "title" && key != "description" && key != "link" && key != "published") {
                iel.push(key);
            } else {
                let showLabel = 1;
                let labelFormat = null;
                let contentFormat = null;
                if (key == "title" || key == "description") showLabel = 0;
                if (key == "title") contentFormat = "§l%%§r";

                itf.push([key, showLabel, labelFormat, contentFormat]);
            }
        }

        myData.push({
            "title": rss.title,
            "url": url,
            "hel": hel,
            "hef": hef,
            "iel": iel,
            "itf": itf
        });
    }

    playerData.set(xuid, myData);
}

function wrapTags(str) {
    return str.replace(/<[^>]+>/g, function (match) {
        return '§7' + match + '§r';
    });
}

function stringifyContent(content) {
    let type = varType(content);
    if (type == "string") {
        return wrapTags(content);
    } else if (type == "array") {
        return wrapTags(greyOut(JSON.stringify(content, null, defaultIndent)));
    } else if (type == "object") {
        return wrapTags(greyOut(JSON.stringify(content, null, defaultIndent)));
    } else {
        return content;
    }
}

function greyOut(str) {
    str = str.replace(/[\{\}\[\],"]/g, function (match) {
        switch (match) {
            case '{':
                return '§7{§r';
            case '}':
                return '§7}§r';
            case '[':
                return '§7[§r';
            case ']':
                return '§7]§r';
            case ',':
                return '§7,§r';
            case '"':
                return '§7"§r';
            default:
                return match;
        }
    });
    return str;
}

function varType(varName) {
    if (typeof (varName) == "string") {
        return "string";
    } else if (typeof (varName) == "object") {
        if (varName instanceof Array) {
            return "array";
        } else if (varName instanceof Object) {
            return "object";
        } else {
            return "other";
        }
    } else {
        return "other";
    }
}

function replaceBetweenPercentSigns(format, content) { /* 替换字符串中所有百分号之间的内容 */
    return format.replace(/%.*?%/g, content);
}

function timestampToLocalString(timestamp) { /* 时间戳转换为本地时间并格式化输出 */
    // 创建一个Date对象
    let date = new Date(timestamp);
    let result = "";
    // 获取本地日期字符串
    let dateString = date.toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });
    // 获取本地时间字符串
    let timeString = date.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
    // 拼接并返回结果
    result = dateString + " " + timeString;
    if (result == "Invalid Date Invalid Date") result = timestamp;
    return result;
}

function valueNotProvided(varible) { /* 判断值是否未提供 */
    return varible == null || varible == undefined || varible.length == 0;
}

function isBlank(str) {
    if (typeof str !== "string") {
        return false; // 如果参数不是字符串，返回false
    }
    for (let i = 0; i < str.length; i++) {
        if (str[i] !== " ") {
            return false; // 如果字符串中有任何非空格字符，返回false
        }
    }
    return true; // 如果字符串中全是空格或为空字符串，返回true
}

function showLoadingInfo() {
    mc.runcmdEx("title @a[tag=isGettingRss] actionbar " + loadingDots[loadingDotsIndex] + " 正在获取RSS");
}

function timer() {
    loadingDotsIndex++;
    if (loadingDotsIndex >= loadingDots.length) {
        loadingDotsIndex = 0;
    }
    showLoadingInfo()
}

function enableTimer() {
    if (timerID == null) timerID = setInterval(timer, 50);
}

function disableTimer() {
    if (timerID != null && timerIsUsing == 0) {
        clearInterval(timerID);
        timerID = null;
    }
}