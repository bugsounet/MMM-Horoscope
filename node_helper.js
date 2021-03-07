/* Magic Mirror
 * Module: MMM-Horoscope
 *
 * By @bugsounet -- Dupont Cédric <bugsounet@bugsounet.fr>
 * MIT Licensed.
 */

const NodeHelper = require("node_helper")
const FeedMe = require("feedme")
const request = require("request")
var log = (...args) => { /* do nothing */ }
const iconv = require("iconv-lite");

module.exports = NodeHelper.create({
  start: function () {
    console.log("[HOROSCOPE] MMM-Horoscope Version:", require('./package.json').version)
    this.RSS= []
    this.RSSConfig= []
    this.RSSLoaded = []
    this.updateTimer = null
    this.Flux= null
    this.Horoscope = [
      {
        from: "Bélier",
        link: "https://www.asiaflash.com/horoscope/rss_horojour_belier.xml"
      },
      {
        from: "Taureau",
        link: "https://www.asiaflash.com/horoscope/rss_horojour_taureau.xml"
      },
      {
        from: "Gémeaux",
        link: "https://www.asiaflash.com/horoscope/rss_horojour_gemeaux.xml"
      },
      {
        from: "Cancer",
        link: "https://www.asiaflash.com/horoscope/rss_horojour_cancer.xml"
      },
      {
        from: "Lion",
        link: "https://www.asiaflash.com/horoscope/rss_horojour_lion.xml"
      },
      {
        from: "Vierge",
        link: "https://www.asiaflash.com/horoscope/rss_horojour_vierge.xml"
      },
      {
        from: "Balance",
        link: "https://www.asiaflash.com/horoscope/rss_horojour_balance.xml"
      },
      {
        from: "Scorpion",
        link: "https://www.asiaflash.com/horoscope/rss_horojour_scorpion.xml"
      },
      {
        from: "Sagittaire",
        link: "https://www.asiaflash.com/horoscope/rss_horojour_sagittaire.xml"
      },
      {
        from: "Capricorne",
        link: "https://www.asiaflash.com/horoscope/rss_horojour_capricorne.xml"
      },
      {
        from: "Verseau",
        link: "https://www.asiaflash.com/horoscope/rss_horojour_verseau.xml"
      },
      {
        from: "Poissons",
        link: "https://www.asiaflash.com/horoscope/rss_horojour_poissons.xml"
      }
    ]
  },

  socketNotificationReceived: function (notification, payload) {
    switch (notification) {
      case "CONFIG":
        this.config = payload
        if (this.config.debug) log = (...args) => { console.log("[HOROSCOPE]", ...args) }
        log("Config:" , this.config)
        this.RSSConfig= this.checkHoroscopesConfig(this.config.Horoscopes)
        this.initialize()
        break
    }
  },

  checkHoroscopesConfig: function(Horoscopes) {
    var Result = []
    Horoscopes.forEach(wanted => {
      this.Horoscope.forEach(value => {
        if (value.from == wanted) Result.push(value)
      })
    })
    return Result
  },

  initialize: async function () {
    await this.getInfos()
    log("Flux RSS chargé: " + this.RSSLoaded.length + "/" + this.RSSConfig.length)
    console.log("[HOROSCOPE] MMM-Horoscope est now initialized!")
    this.sendSocketNotification("INITIALIZED")
    this.scheduleNextFetch()
  },

  getInfos: async function () {
    this.RSSLoaded = await this.checkRSS()

    log("Titles found:", this.RSS.length)

    this.sendDATA(this.RSS)
  },

  checkRSS: function() {
    let data = []
    this.RSSConfig.forEach(flux => {
      data.push(this.getRssInfo(flux.from, flux.link))
    })
    return Promise.all(data)
  },

  getRssInfo: function (from, link) {
    return new Promise(resolve => {
      var encoding = "iso-8859-1"
      const rss = new FeedMe()
      const nodeVersion = Number(process.version.match(/^v(\d+\.\d+)/)[1]);
      const opts = {
        headers: {
          "User-Agent": "Mozilla/5.0 (Node.js " + nodeVersion + ") MMM-Horoscope v" + require('./package.json').version + " (https://github.com/bugsounet/MMM-Horoscope)",
          "Cache-Control": "max-age=0, no-cache, no-store, must-revalidate", Pragma: "no-cache"
        },
        encoding: null
      }
      log ("Fetch horoscope for:", from)

      request(link, opts)
        .on("error", error => {
          console.log("[HOROSCOPE] Error! " + error)
          resolve("Error")
        })
        .pipe(iconv.decodeStream(encoding))
        .pipe(rss)

      rss.on("item", async item => {
        var description= null
        if (item.description) description= this.makeDescription(item.description)
        this.RSS.push ({
          title: item.title,
          description: await this.displayDescription(description),
          pubdate: item.pubdate || item.published || item.updated || item["dc:date"],
          image: await this.getImage(item),
          link: item.link,
          from: from
        })
      })
      rss.on("end", () => {
        log("Fetch done:", from)
        resolve(from)
      })
      rss.on("error", error => {
        console.error("[HOROSCOPE] Fetch", error + " (" + link + ")")
        resolve()
      })
    })
  },

  makeDescription(description) {
    // mouahahh this hard work ! qui peux faire mieux ????
    var Description = description
      .replace(/(\n)/gi,"") // supprimer les retours a la ligne
      .replace(/(<br\/><center><br\/><img.*<br><br>)/gi,"") // supprime l'image du départ
      .replace(/(<br><br><center>.*<\/center>)/gi,"") // supprime les liens de la fin
      .replace(/(<b>Horoscope .* - )/gi,"<b>") // supprime Horoscope <nom du signe>
      // et enfin supprime les truc pas necessaire...
      .replace(/(<br><br><b>Clin d'oeil<.*)/gi,"")
      .replace(/(<br><br><b>Citation du jour<.*)/gi,"")
      .replace(/(<br><br><b>Nombre de chance<.*)/gi,"")
      .replace(/(<br><br>)/gi,"<br>")
    return Description
  },

  displayDescription: function(description) {
    if (this.config.personalize.useAmour && this.config.personalize.useSante
      && this.config.personalize.useArgent && this.config.personalize.useTravail
      && this.config.personalize.useFamille && this.config.personalize.useSocial
    ) return description
    if (!this.config.personalize.useAmour) description = this.deleteAmour(description)
    if (!this.config.personalize.useSante) description = this.deleteSante(description)
    if (!this.config.personalize.useArgent) description = this.deleteArgent(description)
    if (!this.config.personalize.useTravail) description = this.deleteTravail(description)
    if (!this.config.personalize.useFamille) description = this.deleteFamille(description)
    if (!this.config.personalize.useSocial) description = this.deleteSocial(description)
    log("Deleted Needed Value Done")
    return description
  },

  deleteAmour(description) {
    var Description = description.replace(/(<b>Amour.*)/gi,"")
    log("Deleted: Amour")
    return Description
  },

  deleteSante(description) {
    var Description = description.replace(/(<br><b>Santé.*)/gi,"")
    log("Deleted: Santé")
    return Description
  },

  deleteArgent(description) {
    var Description = description.replace(/(<br><b>Argent.*)/gi,"")
    log("Deleted: Argent")
    return Description
  },

  deleteTravail(description) {
    var Description = description.replace(/(<br><b>Travail.*)/gi,"")
    log("Deleted: Travail")
    return Description
  },

  deleteFamille(description) {
    var Description = description.replace(/(<br><b>Famille.*)/gi,"")
    log("Deleted: Famille")
    return Description
  },

  deleteSocial(description) {
    var Description = description.replace(/(<br><b>Vie sociale.*)/gi,"")
    log("Deleted: Social")
    return Description
  },

  getImage(item) {
    if (item.enclosure && item.enclosure.url) return item.enclosure.url
    if (item["media:content"] && item["media:content"].url) return item["media:content"].url
    if (item.thumb) return item.thumb
    if (item.description.match(/<img[^>"']*((("[^"]*")|('[^']*'))[^"'>]*)*>/g)) {
      let imgTag= item.description.match(/<img[^>"']*((("[^"]*")|('[^']*'))[^"'>]*)*>/g)
      if (imgTag.toString().match(/http([^">]+)/g)) return imgTag.toString().match(/http([^">]+)/g)
    }
    return null
  },

  sendDATA: function (data) {
    if (data.length) this.sendSocketNotification("DATA", data)
    else console.log("[HOROSCOPE] Erreur: no data!")
  },

  update: async function () {
    this.RSS= []
    this.RSSLoaded = []
    await this.getInfos()
    log("Update Done")
  },

  scheduleNextFetch: function () {
    clearInterval(this.updateTimer)
    log("Update Timer On: 3600000ms")
    this.updateTimer = setInterval(()=> {
      this.update()
    },3600000)
  },

  /** ***** **/
  /** Tools **/
  /** ***** **/

  /** convert h m s to ms **/
  getUpdateTime: function(str) {
    let ms = 0, time, type, value
    let time_list = ('' + str).split(' ').filter(v => v != '' && /^(\d{1,}\.)?\d{1,}([wdhms])?$/i.test(v))

    for(let i = 0, len = time_list.length; i < len; i++){
      time = time_list[i]
      type = time.match(/[wdhms]$/i)

      if(type){
        value = Number(time.replace(type[0], ''))

        switch(type[0].toLowerCase()){
          case 'w':
            ms += value * 604800000
            break
          case 'd':
            ms += value * 86400000
            break
          case 'h':
            ms += value * 3600000
            break
          case 'm':
            ms += value * 60000
            break
          case 's':
            ms += value * 1000
          break
        }
      } else if(!isNaN(parseFloat(time)) && isFinite(time)){
        ms += parseFloat(time)
      }
    }
    return ms
  }
});
