
      // define svg and dimensions of chart
      const svg = d3.select("svg"),
          margin = {top: 40, right: 40, bottom: 40, left: 40},
          SVGWidth = svg.attr("width"),
          SVGHeight = svg.attr("height"),
          width = SVGWidth - margin.left - margin.right,
          height = SVGHeight - margin.top - margin.bottom;

      // function to get half century units from data
      // voronoi (logical) indicates if voronoi function has been applied to data
      function getHCUnits(d, voronoi) {
        let centuries = voronoi ? d.data.Centuries : d.Centuries;
        let halfCenturies = voronoi ? d.data.HalfCenturies : d.HalfCenturies;
        return halfCenturies + 2 * (centuries);
      }


      // defining all relevant scales

      // batting average across x
      let x = d3.scaleLinear()
          .range([0, width]);
      // radius mapped to strike rate
      let radScale = d3.scaleSqrt()
                      .range([5, 15])
      // stroke colored to team and sized proportional to radius
      let strokeScale = d3.scaleSqrt()
                      .range([1, 4])
      // an outline outside circle to denote half centuries
      let centuryScale = d3.scaleSqrt()
                      .range([0, 4])
      // categorical scale for team colors
      let colScale = d3.scaleOrdinal()
                        .domain(['Peshawar Zalmi', 'Islamabad United', 'Quetta Gladiators', 'Lahore Qalandars', 'Karachi Kings', 'Multan Sultans'])
                        .range(['#FFEB3B','#EF6C00', '#512DA8','#B71C1C', '#9C27B0', '#43A047']);



      async function readAndDrawBeeswarm(){
        let data = await d3.csv('PSL_Batting.csv')
        // add ids and photo links
        preProcssData(data);

        drawBeeswarm(data);
      }

      readAndDrawBeeswarm();

      function drawBeeswarm(data){
          const g = svg.append("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

          const defs = svg.selectAll("defs")
            .data(data)
            .enter()
            .append("defs")

          defs.append("pattern")
            .attr('id', d => d.id)
            .attr('height', '100%')
            .attr('width', '100%')
            .attr("patternContentUnits", "objectBoundingBox")
            .append("image")
            .attr('height', 1)
            .attr('width', 1)
            .attr('preserveAspectRatio', 'none')
            .attr("xlink:href", d => d.photoLink);

          x.domain(d3.extent(data, function(d) { return +d.Avg; }));
          radScale.domain(d3.extent(data, function(d) { return +d.SR; }));
          strokeScale.domain(d3.extent(data, function(d) { return +d.SR; }));
          centuryScale.domain(d3.extent(data, function(d) { return getHCUnits(d, false); }))

          let simulation = d3.forceSimulation(data)
              .force("x", d3.forceX(function(d) { return x(+d.Avg); }).strength(5))
              .force("y", d3.forceY(height / 2))
              .force("collision", d3.forceCollide().radius(d => radScale(d.SR) + strokeScale(d.SR) /*+ centuryScale(getHCUnits(d, false))*/))
              .stop();

          // complete force simulation to get to equilibrium
          for (var i = 0; i < 500; ++i) simulation.tick();

          g.append("g")
              .attr("class", "axis axis--x")
              .attr("transform", "translate(0," + height + ")")
              .call(d3.axisBottom(x).tickValues(d3.range(0, 50, 5)))

          g.select(".axis.axis--x")
            .append('text')
            .attr('class', 'label axis --x')
            .text('Batting Average')
            .style('text-anchor', 'start')
            .style('fill', 'black')
            .attr('transform', 'translate(0, 12)');



          const xGridlines = d3.axisBottom()
                              .scale(x)
                              .tickSize(height)
                              .tickFormat("")

          g.append("g")
            .attr("class", "gridlines axis--x")
            .call(xGridlines);

          d3.selectAll('g.axis.axis--x g text')
            .attr('transform', 'translate(10, -18)')


          data = data.filter(d => !isNaN(d.Avg))


          let voronoi = d3.voronoi()
                          .extent([[-margin.left,  -margin.top], [width + margin.right, height + margin.top]])
                          .x(function(d) { return d.x; })
                          .y(function(d) { return d.y; })

          let cell = g.append("g")
              .attr("class", "cells")
              .selectAll("g")
              .data(voronoi.polygons(data))
              .enter()
              .append("g");

          cell.append("circle")
              .attr('class', 'centuries')
              .attr("r", d => radScale(d.data.SR) + (strokeScale(d.data.SR)/2) + centuryScale(getHCUnits(d, true)))
              .attr("cx", function(d) { return d.data.x; })
              .attr("cy", function(d) { return d.data.y; })
              //.style('fill', d => colScale(d.data.Team))
              .style("fill", 'grey')
              .style('filter', 'url(#dropshadow)')
              .style("fill-opacity", 0.2)
              .style('stroke', 'black')
              .style("stroke-width", d => {
                if (d.data.Centuries > 0 || d.data.HalfCenturies > 0){
                  return .5
                }
                else {
                  return 0
                }
              })
              .style('stroke-opacity', 0.6)

          cell.append("circle")
              .attr('class', 'team-strikeRate')
              .attr("r", d => radScale(d.data.SR))
              .attr("cx", function(d) { return d.data.x; })
              .attr("cy", function(d) { return d.data.y; })
              //.style('fill', d => colScale(d.data.Team))
              .style("fill", d => `url(#${d.data.id})`)
              .style('stroke', d => colScale(d.data.Team))
              .style("stroke-width", d => strokeScale(d.data.SR) + "px")


          cell.append("path")
              .attr("d", function(d) { return "M" + d.join("L") + "Z"; });

          cell.on('mouseover', function(d){
            var player = d.data.Name;
            var role = d.data.TypeA;
            var imgLink = d.data.photoLink;
            var playerAvg = d.data.Avg;
            var playerSR = d.data.SR;
            var matches = d.data.Matches;
            var halfcenturies = parseInt(d.data.HalfCenturies) + parseInt(d.data.Centuries * 2);

            var team = d.data.Team;

            console.log(team);
            d3.select('body').append('div')
              .classed('animated', true)
              .classed('fadeInOpac', true)
              .classed('tool', true)
              .attr('id', 'hoverbox')
            // tooltip selection
            var tooltip = d3.select('.tool');

            tooltip.append('div')
              .classed('colorToolBar', true)
              .style('background-color', colScale(d.data.Team))

            tooltip.append('div')
              .classed('playerInfo', true)

            var playerHead = d3.select('.playerInfo');

            playerHead.append('div')
              .classed('playerName', true)
              .html(function(d) {
                return '<p style="margin-bottom: 5px; margin-top: 1px;">' + player + '</p><p class="playerRole">Role: <span class="bold">' + role + '</span></p>'
              })

            playerHead.append('div')
              .classed('playerAvatar', true)
              .html(function(d) {
                return '<img class="avatar" src="' + imgLink + '"></img>'
              })

            tooltip.append('div')
              .classed('match', true)
              .classed('flexDistance', true);

            var avg = d3.select('.match');

            avg.append('div')
              .classed('title', true)
              .html(function(d) {
                return '<p class="noMargin">Matches Played:</p>'
              })

            avg.append('div')
              .classed('value', true)
              .html(function(d) {
                return '<p class="noMargin">' + matches + '</p>'
              })

            tooltip.append('div')
              .classed('average', true)
              .classed('flexDistance', true);

            var avg = d3.select('.average');

            avg.append('div')
              .classed('title', true)
              .html(function(d) {
                return '<p class="noMargin">Average:</p>'
              })

            avg.append('div')
              .classed('value', true)
              .html(function(d) {
                return '<p class="noMargin">' + playerAvg + '</p>'
              })

            tooltip.append('div')
              .classed('SR', true)
              .classed('flexDistance', true);

            var avg = d3.select('.SR');

            avg.append('div')
              .classed('title', true)
              .html(function(d) {
                return '<p class="noMargin">Strike Rate:</p>'
              })

            avg.append('div')
              .classed('value', true)
              .html(function(d) {
                return '<p class="noMargin">' + playerSR + '</p>'
              })

            tooltip.append('div')
              .classed('HC', true)
              .classed('flexDistance', true);

            var avg = d3.select('.HC');

            avg.append('div')
              .classed('title', true)
              .html(function(d) {
                return '<p class="noMargin">Half Centuries:</p>'
              })

            avg.append('div')
              .classed('value', true)
              .html(function(d) {
                return '<p class="noMargin">' + halfcenturies + '</p>'
              })

            tooltip.append('div')
              .classed('banner_contain', true)
              .html(function(d) {
                if (team === "Islamabad United") {
                  return '<img class="banner" src="./teamBanner/islamabad.png"></img>'
                }
                else if (team === "Karachi Kings") {
                  return '<img class="banner" src="./teamBanner/karachi.png"></img>'
                }
                else if (team === "Quetta Gladiators") {
                  return '<img class="banner" src="./teamBanner/quetta.png"></img>'
                }
                else if (team === "Lahore Qalandars") {
                  return '<img class="banner" src="./teamBanner/lahore.png"></img>'
                }
                else if (team === "Peshawar Zalmi") {
                  return '<img class="banner" src="./teamBanner/peshawar.png"></img>'
                }
                else if (team === "Multan Sultans") {
                  return '<img class="banner" src="./teamBanner/multan.png"></img>'
                }
              })

              tooltip.style('top', d3.event.pageY - document.getElementById('hoverbox').getBoundingClientRect().height/2 + "px");
              if (d3.event.pageX < window.innerWidth/2) {
                tooltip.style('left', d3.event.pageX + 14 + "px");
              }
              else {
                tooltip.style('left', d3.event.pageX - 260 + "px");
              }

            console.log(d.data)
          });

          cell.on('mouseout', function(d){
            d3.selectAll('.tool').remove();
          });


        /*  cell.append("title")
              .text(function(d) { console.log(d.data) }); return d.data.Name + "\n" + d.data.Avg + "\n" + d.data.SR; */
      }

      function preProcssData(data){
        data.forEach(d => {
          d.photoLink = `photos/${d.Name}.jpg`
          d.id = d.Name.replace(/ /g, "");
        })
      }