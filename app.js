let currentData = {}
let lastUpdated
let historyLoaded = false

const hilite = function(word, el) {
  var rgxp = new RegExp(word, 'gi'),
    repl = '<span class="hilite">' + word + '</span>'
  $(el).each(function() {
    $(this).html(
      $(this)
        .html()
        .replace(rgxp, repl)
    )
  })
}

const commafy = function(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const getLocaleDateFromStr = function(str) {
  const date = new Date(str)
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
  const localeDate = date.toLocaleDateString('en-US', options)
  const localeTime = date.toLocaleTimeString('en-US')
  return `${localeDate} ${localeTime}`
}

const loadHistory = function() {
  fetch('https://bigwo.herokuapp.com/archive')
    .then((r) => r.json())
    .then((archive) => {
      const setHistoryTable = (arr) => {
        $('#historyCount').html(arr.length)
        $('#history-table')
          .empty()
          .append($('#history-tmpl').tmpl(arr))
      }

      archive.items = archive.items.map((data) => {
        data.date.pretty = getLocaleDateFromStr(data.date.string)
        return data
      })

      setHistoryTable(archive.items)

      $('body').on('click', '#history-table a', function(ev) {
        ev.preventDefault()
        window.scrollTo(0, 0)

        const word = archive.items.find(
          ({date}) => date.sort === $(this).data('sort')
        )
        currentData = updateDataProps(word)
        populateTemplate()
        drawChart()
        setHistoryTable(archive.items)
      })
    })
}

const populateTemplate = function() {
  $('#placeholder').html($('#current-tmpl').tmpl(currentData))
  hilite(currentData.word, '.headlines a')
}

const setHistoryObserver = function() {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !historyLoaded) {
      loadHistory()
      historyLoaded = true
    }
  })
  observer.observe(document.querySelector('#history-table'))
}

const updateDataProps = function(data) {
  data.total = commafy(data.total)
  data.lastUpdated = getLocaleDateFromStr(lastUpdated)
  currentData = data
  return data
}

const drawChart = function() {
  var data = currentData
  var chartArr = [],
    chartData = new google.visualization.DataTable(),
    options = {
      legend: 'none',
      width: $('.container-fluid').width(),
      fontSize: 14,
      fontName: 'Droid Serif',
      chartArea: {
        top: 0,
        height: '84%',
      },
    }
  _.each(
    _.filter(data.words, function(w) {
      return w[2] === 'w1' || w[2] === 'w2'
    }),
    function(w) {
      chartArr.push(_.initial(w))
    }
  )
  if (!chartArr.length) {
    _.each(
      _.filter(data.words, function(w) {
        return w[2] === 'w3'
      }),
      function(w) {
        chartArr.push(_.initial(w))
      }
    )
    options.chartArea.height = '94%'
  }
  options.height = chartArr.length * options.fontSize * (options.fontSize / 5)
  chartArr = chartArr.map((item) => {
    const color = item[0] === data.word ? 'darkorange' : '#a1a1a1'
    return [...item, color]
  })
  chartData.addColumn('string', 'Word')
  chartData.addColumn('number', 'Count')
  chartData.addColumn({
    type: 'string',
    role: 'style',
  })
  chartData.addRows(chartArr)
  chartData.sort([
    {
      column: 1,
      desc: true,
    },
  ])
  new google.visualization.BarChart(document.getElementById('chart0')).draw(
    chartData,
    options
  )
  setTimeout(() => {
    $('#chart0 text')
      .filter(function() {
        return $(this).text() === data.word
      })
      .css('fill', 'darkorange')
  }, 0)
}

fetch('https://bigwo.herokuapp.com/word')
  .then((r) => r.json())
  .then((data) => {
    lastUpdated = data.date.string
    currentData = updateDataProps(data)

    populateTemplate()
    setHistoryObserver()

    $('body').on('click', '.more-headlines', function() {
      $(this).hide()
      $('.headlines li.hide').slideDown()
      return false
    })

    google.load('visualization', '1', {
      packages: ['corechart'],
    })
    google.setOnLoadCallback(drawChart)

    window.onresize = () => {
      drawChart()
    }
  })
