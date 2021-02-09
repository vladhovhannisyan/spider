const get = function(selector, scope) {
  scope = scope ? scope : document;
  return scope.querySelector(selector);
};

const getAll = function(selector, scope) {
  scope = scope ? scope : document;
  return scope.querySelectorAll(selector);
};


const spider = {
  options: {
    singleTag: false,
    hover: true,
    awsScrap: []
  },
  setup: function() {
    // load css to generated background.html
    get("head").insertAdjacentHTML(
      "beforeend",
      `<link href=${chrome.extension.getURL(
        "content/content.css"
      )} rel="stylesheet" />`
    );

    // load content.html to generated background.html
    fetch(chrome.runtime.getURL("content/content.html"))
      .then(response => response.text())
      .then(data => {
        // disable spider html injection if the extension is already active
        if (!get("#spider-wrapper")) {
          document.body.innerHTML += data;
          document.body.style.paddingBottom = "200px";
        }
        // every element on the page has to be selectevent listeners
        getAll("body").forEach(el => {
          el.addEventListener("mouseover", spider.addHighlight, false);
          el.addEventListener("mouseout", spider.removeHighlight, false);
        });

        spider.renderFromLocalStorage();
      })
      .catch(err => {
        //console.log(err);
      });
  },
  addHyperlinks: function(el) {
    if (el.tagName === "A") {
      el.classList.add("spider-hyperlink");
    } else if (el.parentNode.tagName === "A") {
      el.parentNode.classList.add("spider-hyperlink");
    }
  },
  removeHyperlinks: function(el) {
    el.classList.remove("spider-hyperlink");
  },
  setSingleTag: function() {
    // TODO : Event fire twice
    spider.options.singleTag = true;
  },
  unsetSingleTag: function() {
    spider.options.singleTag = false;
  },
  addSingleTag: function(event) {

    if (!this.hasTags(event)) {
      event.preventDefault();
      this.removeHighlight(event);

      const el = event.target;
      const wrapper = document.createElement("div");
      wrapper.classList.add("spider-tag");
      spider.addHyperlinks(el);
      el.parentNode.insertBefore(wrapper, el);
      wrapper.appendChild(el);
      wrapper.innerHTML += `<div class="spider-close"></div>`;
    }
  },
  removeSingleTag: function(event) {
    event.preventDefault();
    spider.removeHyperlinks(event.target);
    event.target.parentElement.outerHTML =
      event.target.previousElementSibling.outerHTML;
  },
  hasSameTagAndClass: function(a, b) {

    return (
      a.tagName === b.tagName &&
      !!a.classList &&
      !!b.classList &&
      !(a.classList < b.classList || b.classList < a.classList)
    );
  },
  hasSimilarParent: function(a, b) {
    return (
      a.parentNode.tagName === b.parentNode.tagName ||
      a.parentNode.classList.contains(b.parentNode.classList[0])
    );
  },
  addMultiTags: function(event) {
    this.awsScheduleData(event);

    if (!this.hasTags(event)) {
      this.removeHighlight(event);
      // turn selection into tags (text + close btn)
      const selector =
        event.target.classList.length > 0
          ? `${event.target.tagName}.${Array.prototype.join.call(
              event.target.classList,
              "."
            )}`
          : `${event.target.tagName}`;
      const suggested = getAll(selector);
      const finalSuggested = [];

      for (var i = 0; i < suggested.length; i++) {
        if (
          spider.hasSameTagAndClass(event.target, suggested[i]) &&
          spider.hasSimilarParent(event.target, suggested[i])
        ) {
          finalSuggested.push(suggested[i]);
        }
      }

      finalSuggested.forEach(el => {
        const wrapper = document.createElement("div");
        wrapper.classList.add("spider-tag");
        spider.addHyperlinks(el);
        el.parentNode.insertBefore(wrapper, el);
        wrapper.appendChild(el);
        wrapper.innerHTML += `<div class="spider-close"></div>`;
      });
    }
  },
  removeAllTags: function(event) {
    event.preventDefault();
    getAll(".spider-tag").forEach(function(el) {
      el.outerHTML = el.innerHTML;
    });
    getAll(".spider-hyperlink").forEach(function(el) {
      spider.removeHyperlinks(el);
    });
    // ensure every close btn is removed.
    getAll(".spider-close").forEach(function(el) {
      el.remove();
    });
  },
  hasTags: function(event) {
    return event.target.parentNode.classList.contains("spider-tag")
      ? true
      : false;
  },
  addHighlight: function(event) {
    // TODO: fine tune this logic
    const hasSpiderTags =
      event.target.classList.contains("spider-ext") ||
      event.target.classList.contains("spider-tag") ||
      event.target.parentNode.classList.contains("spider-tag") ||
      event.target.parentNode.getElementsByClassName("spider-tag").length > 0;

    if (!hasSpiderTags && spider.options.hover) {
      event.target.classList.add("spider-highlight");
    }
  },
  removeHighlight: function(event) {
    event.target.classList.remove("spider-highlight");
  },
  closeAllDropdowns: function() {
    getAll(".spider-dropdown").forEach(dropdown => {
      dropdown.style.display = "none";
    });
  },
  toggleDropdown: function(event) {
    const dropdown = event.target.nextElementSibling;

    if (dropdown.style.display === "block") {
      dropdown.style.display = "none";
    } else {
      this.closeAllDropdowns();
      dropdown.style.display = "block";
    }
  },
  getProjectName: function() {
    return get("#spider-fileName").value || "project_name";
  },
  addColumn: function(uid) {
    const table = get("#spider-content");
    const newColumn = document.createElement("div");

    newColumn.classList.add("spider-column");
    newColumn.classList.add("spider-ext");
    newColumn.id = `spider-column-${uid}`;
    newColumn.innerHTML = `
    <input class="spider-ext spider-columnname" id="spider-fieldName-${uid}" value="Column Name" />
    <div class="spider-ext spider-deletecolumn" id="spider-deleteColumn-${uid}"></div>
    <div class="spider-container spider-ext" id="spider-container-${uid}"></div>
    <div class="spider-ext spider-addSelectionBtn" id="spider-addSelection-${uid}">+ Add Selection</div>`;
    table.appendChild(newColumn);
  },
  deleteColumn: function(uid) {
    get(`#spider-column-${uid}`).remove();
  },
  deleteAllColumns: function() {
    getAll(".spider-column").forEach(column => {
      column.remove();
    });
  },
  generateUniqueID: function() {
    return Math.random()
      .toString(36)
      .substr(2, 9);
  },
  getColumnHeaderArray: function() {
    const header = [];
    let prevValue = "";
    getAll(".spider-columnname").forEach(function(name, index) {
      if (name.value === prevValue) {
        header.push(`${name.value} ${index}`); // ["Column Name", "Column Name 1"]
      } else {
        header.push(name.value); //["bakeries", "author"]
      }
      prevValue = name.value;
    });
    return header;
  },
  getLongestColumnCount: function() {
    const columns = getAll(".spider-column");
    const result = [];
    // get longest column length
    columns.forEach(column => {
      const tags = getAll(".spider-selectiontags", column);
      result.push(tags.length);
    });
    return Math.max(...result);
  },
  generate2DArray: function() {
    const columns = getAll(".spider-column");
    let resultRows = new Array(this.getLongestColumnCount());
    let resultColumns = new Array(columns.length);
    for (let k = 0; k < resultRows.length; k++) {
      resultRows[k] = new Array(resultColumns);
    }

    columns.forEach((column, i) => {
      const tags = getAll(".spider-selectiontags", column);
      tags.forEach((tag, j) => {
        resultRows[j][i] = `"${tag.innerText}"`;
      });
    });

    resultRows.unshift(this.getColumnHeaderArray());
    return resultRows;
  },
  generateJSON: function() {
    const result = this.grepJSONData();
    const fileName = this.getProjectName();
    chrome.runtime.sendMessage({
      name: "download-json",
      data: JSON.stringify(result),
      filename: fileName
        .trim()
        .replace(/\s+/g, "-")
        .toLowerCase()
    });
  },
  generateCSV: function() {
    // no column id for csv
    const result = this.grepCSVData();
    const fileName = this.getProjectName();
    chrome.runtime.sendMessage({
      name: "download-csv",
      data: result,
      filename: fileName
        .trim()
        .replace(/\s+/g, "-")
        .toLowerCase()
    });
  },
  grepCSVData: function() {
    const resultRows = this.generate2DArray();
    return resultRows
      .map(function(d) {
        return d.join();
      })
      .join("\n");
  },
  grepJSONData: function() {
    const resultRows = this.generate2DArray();
    let data = [];

    for (let i = 0; i < resultRows.length - 1; i++) {
      let obj = {};
      for (let k = 0; k < resultRows[0].length; k++) {
        // turn 2darray into json object
        // then trim off the start/end double quote
        let value =
          typeof resultRows[i + 1][k] === "string"
            ? resultRows[i + 1][k].replace(/^"(.+(?="$))"$/, "$1")
            : "";
        obj[resultRows[0][k]] = value;
      }
      data.push(obj);
    }

    return {
      type: "single-page",
      name: this.getProjectName(),
      data: data
    };
  },
  grepData: function() {
    const columns = getAll(".spider-column");
    const result = {
      name: this.getProjectName(),
      type: "single-page",
      data: []
    };

    columns.forEach(function(column) {
      const tags = getAll(".spider-selectiontags", column);
      const col = {
        column_id: get(".spider-columnname", column).id.split("-")[2],
        column_name: get(".spider-columnname", column).value,
        column_data: []
      };

      tags.forEach(function(tag) {
        col.column_data.push(tag.innerText);
      });
      result.data.push(col);
    });
    return result;
  },
  renderColumns: function(columns) {
    columns.forEach(function(column) {
      spider.addColumn(column.column_id);
      get(`#spider-fieldName-${column.column_id}`).value = column.column_name;
      column.column_data.forEach(d => {
        get(
          `#spider-container-${column.column_id}`
        ).innerHTML += `<p class="spider-ext spider-selectiontags">${d}</p>`;
      });
    });
  },
  renderFromLocalStorage: function() {
    chrome.storage.local.get(["spider"], function(result) {
      if (result.spider) {
        get("#spider-fileName").value = result.spider.name;
        spider.renderColumns(result.spider.data);
      } else {
        spider.addColumn(spider.generateUniqueID());
      }
    });
  },
  saveSelection: function(id) {
    let html = "";
    getAll(".spider-tag").forEach(tag => {
      if (tag.childNodes[0].tagName === "IMG") {
        html += `<p class="spider-ext spider-selectiontags">${
          tag.childNodes[0].src
        }</p>`;
      } else {
        html += `<p class="spider-ext spider-selectiontags">${
          tag.innerText
        }</p>`;
      }
    });

    get(`#spider-container-${id}`).innerHTML += html;
  },
  saveHyperlinks: function(id) {
    let html = "";
    getAll(".spider-hyperlink").forEach(tag => {
      html += `<p class="spider-ext spider-selectiontags">${tag.href}</p>`;
    });
    get(`#spider-container-${id}`).innerHTML += html;
  },
  getPages: function() {
    let links = this.pageLinks();
    let upToPage = this.getPageNumbers();
    let iterator = 0;
    // console.log(links);

    getAll(".other-page").forEach(el => {
      el.remove();
    });

    get('#cover-spin').style.display = 'block';


    for (let i=0; i<upToPage-1; i++) {
      let popup = window.open(links[i], '_blank', 'toolbar=no,status=no,menubar=no,scrollbars=no,resizable=no,left=10000, top=10000, width=10, height=10, visible=none', '');
      popup.resizeTo(0,0);
      popup.blur();

      // popup.moveTo(0,0);
      // popup.moveTo(0,window.screen.availHeight+10);

      popup.onload = function() {
        let page = popup.document.documentElement.outerHTML;
        popup.close();

        let div = document.createElement("div");
        div.className = "other-page";
        div.style.height='0';
        div.style.overflow = "hidden";
        div.innerHTML = page;
        document.body.appendChild(div);

        iterator++;
      };
    }

    setTimeout(function() {
      get('#cover-spin').style.display = 'none';

    }, 4500);

  },
  pageLinks: function() {
    const baseUrl = window.location.origin;
    const host = window.location.host.split('.')[1];
    const links = [];

    getAll("a").forEach(el => {
      if (!isNaN(el.innerText ) && !isNaN(parseInt(el.innerText))) {
        if (el.getAttribute("href").match(host)) {
          links.push(el.getAttribute("href"));
        } else {
          links.push(baseUrl+el.getAttribute("href"));
        }
      }
    });
    return links;
  },
  getPageNumbers: function() {
    let el = get('#spider-select-pages');
    let value = el.options[el.selectedIndex].value;
    return parseInt(value);
  },
  awsScheduleData: function (event) {
    // @ToDo empty array

    spider.options.awsScrap = [];

    let elements = {
      'nodeName': event.target.tagName,
      'parenNodeName': event.target.parentNode.tagName,
      'nodeClass': null,
      'parentNodeClass': null
    };

    if (event.target.classList.contains('spider-highlight')) {
      event.target.classList.remove("spider-highlight");
    }
    if (event.target.classList.length) {
      elements.nodeClass = event.target.classList[0];
    }
    if (event.target.parentNode.classList.length) {
      elements.parentNodeClass = event.target.parentNode.classList[0];
    }
    spider.options.awsScrap.push(elements);
  },
  saveToLocalStorage: function(value) {
    const btn = get("#spider-saveAll");
    btn.classList.add("saving");

    chrome.storage.local.set({ spider: value }, function() {
      setTimeout(function() {
        btn.classList.remove("saving");
      }, 300);
    });
  },
  clearLocalStorage: function() {
    this.deleteAllColumns();
    chrome.storage.local.clear(() => {});
  },
  toggleExpansion: function() {
    const contentwrapper = get("#spider-contentwrapper");
    const spiderwrapper = get("#spider-wrapper");
    const btn = get("#spider-expandbtn");

    if (
      spiderwrapper.classList.contains("expand") &&
      contentwrapper.classList.contains("expand")
    ) {
      // minimize
      spiderwrapper.classList.remove("expand");
      contentwrapper.classList.remove("expand");
      btn.classList.remove("minimize");
    } else {
      // expand
      spiderwrapper.classList.add("expand");
      contentwrapper.classList.add("expand");
      btn.classList.add("minimize");
    }
  }
};

spider.setup();


document.addEventListener("keypress", function(event) {
  const key = event.keyCode;
  if (key === 13 || key === 27) {
    event.preventDefault();
    event.target.blur();
    event.target.classList.add("animate-flash");

    setTimeout(function() {
      event.target.classList.remove("animate-flash");
    }, 300);
  }
});


document.addEventListener("click", function(event) {
  if (event.target.id.match("spider-tagoption")) {
    event.target.checked ? spider.setSingleTag() : spider.unsetSingleTag();
  }

  if (event.target.classList.contains("spider-close")) {
    spider.options.singleTag
      ? spider.removeSingleTag(event)
      : spider.removeAllTags(event);
  }
  if (event.target.classList.contains("spider-triggerdropdown")) {
    spider.toggleDropdown(event);
  }
  if (event.target.id.match("spider-cleanall")) {
    spider.clearLocalStorage();
    spider.closeAllDropdowns();
  }
  if (event.target.id.match("spider-saveAll")) {
    const data = spider.grepData();
    const appData = spider.grepJSONData();
    spider.saveToLocalStorage(data);
  }

  if (event.target.id.match("spider-addSelection")) {
    const id = event.target.id.split("-")[2]; // ["spider", "addSelection", "3ti60cjou"]

    if (getAll(".spider-hyperlink").length > 0) {
      spider.addColumn(`links${id}`);
      spider.saveHyperlinks(`links${id}`);
    }
    spider.saveSelection(id);
    spider.removeAllTags(event);
  }
  if (event.target.id.match("spider-downloadJSON")) {
    spider.generateJSON();
    spider.closeAllDropdowns();
  }
  if (event.target.id.match("spider-downloadCSV")) {
    spider.generateCSV();
    spider.closeAllDropdowns();
  }

  if (event.target.id.match("spider-newColumn")) {
    const id = spider.generateUniqueID();
    spider.closeAllDropdowns();
    spider.addColumn(id);
  }

  if (event.target.id.match("spider-deleteColumn")) {
    const id = event.target.id.split("-")[2];
    spider.deleteColumn(id);
  }

  // add tags
  if (event.target.classList.contains("spider-highlight")) {
    event.preventDefault();
    event.stopPropagation();

    spider.options.singleTag
      ? spider.addSingleTag(event)
      : spider.addMultiTags(event);
  }

  if (event.target.id.match("spider-expandbtn")) {
    spider.toggleExpansion();
  }

  if (event.target.id.match("spider-quit")) {
    window.location.reload();
  }

  if (event.target.id.match("spider-pages")) {
    spider.getPages();
  }

  // site info
  if (event.target.id.match("spider-schedule-save")) {
    let url = window.location.href;
    let date = get('#spider-schedule-date').value;
    // let page = get('#spider-schedule-pages').value;
    let page = 1;
    let scrapData = spider.options.awsScrap;
    let stringifyData = "";

    console.log(scrapData);


    event.target.classList.add("saving");
    setTimeout(function() {
      event.target.classList.remove("saving");
    }, 1000);
    // console.log('content --- ', url, date, page, scrapData);
    scrapData.forEach(function(item){
      for (var prop in item) {
        let separator = (prop === 'parentNodeClass')?'~':'___';
        stringifyData += `${prop}*${item[prop]}${separator}`;
      }
    });
    // console.log(stringifyData);
    chrome.runtime.sendMessage({
      "name": "schedule-details",
      "url": url,
      "date": date,
      "page": page,
      "siteData": stringifyData,
    });
  }

  // run aws scraper
  if (event.target.id.match("spider-schedule-run")) {
    chrome.runtime.sendMessage({
      "name": "schedule-run"
    });
  }

  // display scraped data from aws
  if (event.target.id.match("spider-schedule-data")) {
    var modal = document.getElementById("myModal");
    var modalContant = get('.modal-content');

    // modal.style.display = "block";

    var requestOptions = {
      method: 'GET',
      redirect: 'follow'
    };

    fetch("https://2qxsbkq5wc.execute-api.us-east-2.amazonaws.com/pro", requestOptions)
        .then(response => response.text())
        .then(
            function (result) {

              // console.log(result);

              let resultParse = JSON.parse(result);

              // console.log(resultParse);                

              let items = resultParse.Items;  

              console.log(items);

              for (var prop in items) {
                // console.log(resultParse[prop]['key'] + " = " + resultParse[prop]['value']);
                // console.log(items[prop]['name']['S']);

                let name = items[prop]['name']['S']  

                let elChild = document.createElement('p');

                elChild.className = "aClassName";
                elChild.className = "spider-ext";

                elChild.innerHTML = name;
                modalContant.appendChild(elChild);

              }

              modal.style.display = "block";

            }
        )
        .catch(error => console.log('error', error));
  }

  if (event.target.id.match("close")) {
    var modal = document.getElementById("myModal");
    modal.style.display = "none";
  }


});

document.addEventListener("change", function(event) {
  if (event.target.id.match("spider-select-pages")) {
    spider.getPages();
  }

});
