/* Magic Mirror
 * Module: Horoscope FR
 *
 * By @bugsounet -- Dupont Cédric <bugsounet@bugsounet.fr>
 * MIT Licensed.
 */

Module.register("MMM-Horoscope", {
  requiresVersion: "2.14.0",
  defaults: {
    debug: false,
    speed: "30s",
    Horoscopes: [
      "Bélier",
      "Taureau",
      "Gémeaux",
      "Cancer",
      "Lion",
      "Vierge",
      "Balance",
      "Scorpion",
      "Sagittaire",
      "Capricorne",
      "Verseau",
      "Poissons"
    ],
    personalize: {
      DescriptionColor: "#000",
      DescriptionBackground: "#FFF",
      width: "450px",
      useAmour: true,
      useSante: true,
      useArgent: true,
      useTravail: true,
      useFamille: true,
      useSocial: false
    }
  },

  start: function () {
    this.item = 0
    this.RSS = []
    this.update = null
    this.fade = null
    this.single = false
    this.updated = false
    this.config.speed = this.getUpdateTime(this.config.speed)
    console.log("[HOROSCOPE] Starting MMM-Horoscope")
  },

  notificationReceived: function (notification, payload, sender) {
    switch (notification) {
      case "DOM_OBJECTS_CREATED":
        this.sendSocketNotification("CONFIG", this.config)
        break
    }
  },

  socketNotificationReceived: function (notification, payload) {
    switch (notification) {
      case "INITIALIZED":
        console.log("[HOROSCOPE] Ready ~ The show must go on!")
        this.item = 0
        this.displayChoice()
        break
      case "DATA":
        if (this.config.debug) console.log("[HOROSCOPE] Data", payload)
        this.RSS= payload
        if (this.RSS && this.RSS.length == 1) {
          this.updated = false
          this.single = true
        }
        this.item = -1
        break
    }
  },

  DisplayNext: function () {
    if (this.config.speed < 10*1000) this.config.speed = 10*1000
    clearInterval(this.update)
    this.update = setInterval(() => {
      this.item++
      this.displayChoice()
    }, this.config.speed)
  },

  displayChoice: function () {
    if (this.RSS.length == 0) {
      this.item = -1
      return this.DisplayNext()
    }
    if (this.item > this.RSS.length-1) this.item = 0
    if (this.single && this.updated) return
    if (!this.RSS[this.item] || !this.RSS[this.item].description || this.RSS[this.item].description == "") return this.DisplayNext()

    var logo = document.getElementById("HOROSCOPE_LOGO")
    var description = document.getElementById("HOROSCOPE_DESCRIPTION")
    var title = document.getElementById("HOROSCOPE_TITLE")
    var contener = document.getElementById("HOROSCOPE_CONTENER")

    contener.classList.add("hideArticle")
    contener.classList.remove("showArticle")

    title.classList.remove("start")
    title.classList.add("stop")

    description.classList.add("hideArticle")
    description.classList.remove("showArticle")

    this.fade = setTimeout(()=>{
      if (this.RSS[this.item]) {
        var NBSource = this.config.debug ? " [" + this.item + "/" + (this.RSS.length-1) + "]" : ""

        if (!this.RSS[this.item].image) image.removeAttribute('src')
        else {
          logo.src = this.RSS[this.item].image
          logo.addEventListener('error', () => {
            image.removeAttribute('src')
          }, false)
        }

        description.innerHTML = this.RSS[this.item].description
        title.innerHTML = this.RSS[this.item].title + NBSource

        contener.classList.remove("hideArticle")
        contener.classList.add("showArticle")
        title.classList.remove("stop")
        title.classList.add("start")
        description.classList.remove("hideArticle")
        description.classList.add("showArticle")
        this.DisplayNext()
      } else {
        console.log("[HOROSCOPE] RSS error")
        this.item = 0
        this.displayChoice()
      }
      this.updated = true
    }, 1200)
  },

  getDom: function () {
    var wrapper= document.createElement("div")

    var contener= document.createElement("div")
    contener.id= "HOROSCOPE_CONTENER"
    contener.classList.add("hideArticle")
    contener.style.color= this.config.personalize.DescriptionColor
    contener.style.backgroundColor= this.config.personalize.DescriptionBackground
    contener.style.width = this.config.personalize.width

    var content= document.createElement("div")
    content.id= "HOROSCOPE_CONTENT"

    var logo = document.createElement("img")
    logo.id = "HOROSCOPE_LOGO"

    var title = document.createElement("div")
    title.id = "HOROSCOPE_TITLE"
    content.appendChild(logo)
    content.appendChild(title)

    var description= document.createElement("div")
    description.id = "HOROSCOPE_DESCRIPTION"

    content.appendChild(description)
    contener.appendChild(content)

    wrapper.appendChild(contener)

    return wrapper
  },

  getStyles: function() {
    return ["MMM-Horoscope.css"]
  },


  /** ***** **/
  /** Tools **/
  /** ***** **/

  /** convert h m s to ms
   ** str sample => "1d 15h 30s"
   **/
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
