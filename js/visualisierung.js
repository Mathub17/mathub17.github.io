var slider_loaded = false;

//Kategorien laden
d3.json("data/Kategorien.json", function (data) {

    var category = d3.select("#category")

    category.selectAll("li")
        .data(data)
        .enter()
        .append("li")
        .attr("id", function (d) {
            return d.category;
        })
        .each(function (d, i) {
            if (i === 0) {
                d3.select(this).attr("class", "active");
                displayquestions(d3.select(this).attr("id"));
            }
        })
        .append("a")
        .attr("href", "#")
        .text(function (d) {
            return d.category_text
        });

    d3.select('#selected_category').html(data[0].category_text);

});

// Fragen zur selektierten Kategorie laden
function displayquestions(selected_category) {

    d3.json("data/Fragen.json", function (data) {

        var selected_questions = [];

        for (var x = 0; x < data.length; x++) {

            if (data[x].category == selected_category) {

                selected_questions.push(data[x]);
            }
        };

        var rand = Math.round(Math.random() * (selected_questions.length - 1));

        var questions = d3.select("#questions")

        questions.selectAll("li")
            .data(selected_questions)
            .enter()
            .append("li")
            .attr("class", "list-group-item small")
            .attr("id", function (d) {
                return d.ID_question;
            })
            .each(function (d, i) {
                if (i === rand) {
                    d3.select(this).classed("active", true);
                    // initial visualisation
                    load_barchart(d3.select(this).attr("id"));
                }
            })
            .text(function (d) {
                return d.question
            });
    });
};


function load_barchart(tmp) {

    // Ansatz: http://bl.ocks.org/tmaybe/6144082

    var margin = {
        top: 10,
        right: 40,
        bottom: 65,
        left: 50
    }

    var width = Math.min(window.innerWidth, 700) - margin.left - margin.right,
        height = Math.min(window.innerWidth, 600) - margin.top - margin.bottom;

    var xscale = d3.scale.ordinal()
        .rangeRoundBands([0, width], .1);

    var yscale = d3.scale.linear()
        .rangeRound([height, 0]);

    var xaxis = d3.svg.axis()
        .scale(xscale)
        .orient("bottom");

    var yaxis = d3.svg.axis()
        .scale(yscale)
        .orient("left")
        .tickFormat(d3.format(".0%")); // **

    var svglegend = d3.select("#chart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", 40)
        .append("g")
        .attr("transform", "translate(10, 20)");

    var svg = d3.select("#chart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var frageID = tmp;


    // Daten laden
    d3.json("data/Kandidaten.json", function (error1, data) {
        d3.json("data/Sitze.json", function (error2, sitze) {

            // Min & Max Alter in Data
            var min_age = Number.POSITIVE_INFINITY;
            var max_age = Number.NEGATIVE_INFINITY;
            var haha;
            for (var x = 0; x < data.length; x++) {
                haha = new Date().getFullYear() - data[x].year_of_birth;
                if (haha < min_age) {
                    min_age = haha
                };
                if (haha > max_age) {
                    max_age = haha
                };
            }

            d3.select("#slider")
                .attr("data-slider-min", min_age)
                .attr("data-slider-max", max_age)
                .attr("data-slider-value", "[" + min_age + "," + max_age + "]");

            // Nur bei intitialem laden der Seite
            if (!slider_loaded) {
                var slider = new Slider('#slider', {
                    tooltip: 'hide'
                });
                slider_loaded = true;
                // Alter zu Slider hinzufügen
                d3.select("#min_age").text(min_age);
                d3.select("#max_age").text(max_age);
            }

            // Transformation der Daten für Visualisierung
            var input = [];
            var budgetfrage = false;

            input.push({
                "Absolutes": "Base: All Respondents"
            }, {
                "Absolutes": 0
            }, {
                "Absolutes": 25
            }, {
                "Absolutes": 50
            }, {
                "Absolutes": 75
            }, {
                "Absolutes": 100
            })

            // Männer resp. Frauen aus data löschen
            if (d3.select("#m").attr("class") == "btn btn-primary btn-xs") {
                var lng = data.length - 1;
                while (lng >= 0) {
                    if (data[lng].gender != "m") {
                        data.splice(lng, 1);
                    }
                    lng--;
                }
            } else if (d3.select("#f").attr("class") == "btn btn-primary btn-xs") {
                var lng = data.length - 1;
                while (lng >= 0) {
                    if (data[lng].gender != "f") {
                        data.splice(lng, 1);
                    }
                    lng--;
                }
            }

            // Gewählt resp. nicht gewählt?
            if (d3.select("#elected_true").attr("class") == "btn btn-primary btn-xs") {
                var lng = data.length - 1;
                while (lng >= 0) {
                    if (!data[lng].elected) {
                        data.splice(lng, 1);
                    }
                    lng--;
                }
            } else if (d3.select("#elected_false").attr("class") == "btn btn-primary btn-xs") {
                var lng = data.length - 1;
                while (lng >= 0) {
                    if (data[lng].elected) {
                        data.splice(lng, 1);
                    }
                    lng--;
                }
            }

            // nicht in ausgewählter Alters-Range?
            var lng = data.length - 1;
            while (lng >= 0) {
                var candidate_age = new Date().getFullYear() - data[lng].year_of_birth;
                if (candidate_age > d3.select("#max_age").text() || candidate_age < d3.select("#min_age").text()) {
                    data.splice(lng, 1);
                }
                lng--;
            }

            for (var a = 0; a < data.length; a++) {

                var temp_answer = null;
                var temp_inputpos = null;
                var party_exists = false;

                if (typeof data[a].answers !== "undefined") {

                    for (var b = 0; b < data[a].answers.length; b++) {

                        // Antwort zu ausgewählter Frage vorhanden?
                        if (data[a].answers[b].questionId == frageID) {
                            temp_answer = data[a].answers[b].answer;
                            break;
                        }
                    }

                    if (temp_answer !== null) {

                        for (var c = 0; c < input.length; c++) {

                            if (input[c].Absolutes == temp_answer) {
                                temp_inputpos = c;
                            }

                            //Existiert Partei bereits?
                            if (input[c].hasOwnProperty(data[a].party_short)) {
                                party_exists = true;
                            }
                        }

                        if (!party_exists) {
                            for (var d = 0; d < input.length; d++) {
                                input[d][data[a].party_short] = 0;
                            }
                        }

                        input[0][data[a].party_short] += 1;
                        input[temp_inputpos][data[a].party_short] += 1;
                    }

                    if (temp_answer == 50) {
                        budgetfrage = true;
                    }
                }
            };

            if (budgetfrage) {

                input[1].Absolutes = "Deutlich weniger";
                input[2].Absolutes = "Weniger";
                input[3].Absolutes = "Gleich viel";
                input[4].Absolutes = "Mehr";
                input[5].Absolutes = "Deutlich mehr";

                var colors = d3.scale.ordinal()
                    .range(["#f71616", "#fc6464", "#cbc8bf", "#5a6cf4", "#1831f0"]);

                d3.select("#sort4").text("Deutlich weniger")
                d3.select("#sort5").text("Deutlich mehr")


            } else {

                input.splice(3, 1);

                input[1].Absolutes = "Nein";
                input[2].Absolutes = "Eher Nein";
                input[3].Absolutes = "Eher Ja";
                input[4].Absolutes = "Ja";


                var colors = d3.scale.ordinal()
                    .range(["#f71616", "#fc6464", "#5a6cf4", "#1831f0"]);

                d3.select("#sort4").text("Nein")
                d3.select("#sort5").text("Ja")
            };


            //--------------------------------------------------------------
            // Visualisierung



            // rotate the data
            var categories = d3.keys(input[0]).filter(function (key) {
                return key !== "Absolutes";
            });
            var parsedata = categories.map(function (name) {
                return {
                    "Absolutes": name
                };
            });
            input.forEach(function (d) {
                parsedata.forEach(function (pd) {
                    pd[d["Absolutes"]] = d[pd["Absolutes"]];
                });
            });

            // map column headers to colors (except for 'Absolutes' and 'Base: All Respondents')
            colors.domain(d3.keys(parsedata[0]).filter(function (key) {
                return key !== "Absolutes" && key !== "Base: All Respondents";
            }));

            // add a 'responses' parameter to each row that has the height percentage values for each rect
            parsedata.forEach(function (pd) {
                var y0 = 0;
                // colors.domain() is an array of the column headers (text)
                // pd.responses will be an array of objects with the column header
                // and the range of values it represents
                pd.responses = colors.domain().map(function (response) {
                    var responseobj = {
                        response: response,
                        y0: y0,
                        yp0: y0
                    };
                    y0 += +pd[response];
                    responseobj.y1 = y0;
                    responseobj.yp1 = y0;
                    return responseobj;
                });
                // y0 is now the sum of all the values in the row for this category
                // convert the range values to percentages
                pd.responses.forEach(function (d) {
                    d.yp0 /= y0;
                    d.yp1 /= y0;
                });
                // save the total
                pd.totalresponses = pd.responses[pd.responses.length - 1].y1;
            });

            // Wahlstärken-Parameter hinzufügen
            parsedata.forEach(function (pd) {
                for (var x = 0; x < sitze.length; x++) {
                    if (sitze[x].party_short == pd.Absolutes) {
                        pd.sitze = sitze[x].sitze;
                    }
                }
            });

            // Durchschnitt berechnen
            if (!budgetfrage) {

                for (var x = 0; x < parsedata.length; x++) {
                    parsedata[x].durchschnitt = ((parsedata[x]["Eher Nein"] * 25 + parsedata[x]["Eher Ja"] * 75 + parsedata[x]["Ja"] * 100) / parsedata[x]["totalresponses"]);
                }

            } else {
                for (var x = 0; x < parsedata.length; x++) {
                    parsedata[x].durchschnitt = ((parsedata[x]["Weniger"] * 25 + parsedata[x]["Gleich viel"] * 50 + parsedata[x]["Mehr"] * 75 + parsedata[x]["Deutlich mehr"] * 100) / parsedata[x]["totalresponses"]);
                }
            }


            // Sortierung nach ausgewähltem Parameter
            // Wähleranteil
            if (d3.select("#sort1").attr("class") == "sort btn btn-primary btn-xs") {
                parsedata.sort(function (a, b) {
                    return (b.sitze - a.sitze) || (b["Base: All Respondents"] - a["Base: All Respondents"]);
                })
            }
            // Anzahl Antworten
            else if (d3.select("#sort2").attr("class") == "sort btn btn-primary btn-xs") {
                parsedata.sort(function (a, b) {
                    return (b["Base: All Respondents"] - a["Base: All Respondents"]);
                })
            }
            // Durchscnitt
            else if (d3.select("#sort3").attr("class") == "sort btn btn-primary btn-xs") {
                parsedata.sort(function (a, b) {
                    return b.durchschnitt - a.durchschnitt;
                })
            }
            // Nein resp deutlich weniger
            else if (d3.select("#sort4").attr("class") == "sort btn btn-primary btn-xs") {
                parsedata.sort(function (a, b) {
                    return (b.responses[0].yp1 - a.responses[0].yp1) || ((b.responses[1].yp1 - b.responses[1].yp0) - (a.responses[1].yp1 - a.responses[1].yp0)) || ((b.responses[2].yp1 - b.responses[2].yp0) - (a.responses[2].yp1 - a.responses[2].yp0)) || ((b.responses[3].yp1 - b.responses[3].yp0) - (a.responses[3].yp1 - a.responses[3].yp0));
                })
            }
            // Ja resp deutlich mehr
            else if (d3.select("#sort5").attr("class") == "sort btn btn-primary btn-xs") {
                if (!budgetfrage) {
                    parsedata.sort(function (a, b) {
                        return ((b.responses[3].yp1 - b.responses[3].yp0) - (a.responses[3].yp1 - a.responses[3].yp0)) || ((b.responses[2].yp1 - b.responses[2].yp0) - (a.responses[2].yp1 - a.responses[2].yp0)) || ((b.responses[1].yp1 - b.responses[1].yp0) - (a.responses[1].yp1 - a.responses[1].yp0));
                    })
                } else {
                    parsedata.sort(function (a, b) {
                        return ((b.responses[4].yp1 - b.responses[4].yp0) - (a.responses[4].yp1 - a.responses[4].yp0)) || ((b.responses[3].yp1 - b.responses[3].yp0) - (a.responses[3].yp1 - a.responses[3].yp0)) || ((b.responses[2].yp1 - b.responses[2].yp0) - (a.responses[2].yp1 - a.responses[2].yp0)) || ((b.responses[1].yp1 - b.responses[1].yp0) - (a.responses[1].yp1 - a.responses[1].yp0));
                    })
                }
            }

            // ordinal-ly map categories to x positions
            xscale.domain(parsedata.map(function (d) {
                return d.Absolutes;
            }));

            // add the x axis and rotate its labels
            svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .call(xaxis)
                .selectAll("text")
                .attr("y", 5)
                .attr("x", 7)
                .attr("dy", ".35em")
                .attr("transform", "rotate(65)")
                .style("text-anchor", "start");

            // add the y axis
            svg.append("g")
                .attr("class", "y axis")
                .call(yaxis);

            // create svg groups ("g") and place them
            var category = svg.selectAll(".category")
                .data(parsedata)
                .enter().append("g")
                .attr("class", "category")
                .attr("transform", function (d) {
                    return "translate(" + xscale(d.Absolutes) + ",0)";
                });

            // draw the rects within the groups
            category.selectAll("rect")
                .data(function (d) {
                    return d.responses;
                })
                .enter().append("rect")
                .attr("width", xscale.rangeBand() - 3)
                .attr("y", function (d) {
                    return yscale(d.yp1);
                })
                .attr("height", function (d) {
                    return yscale(d.yp0) - yscale(d.yp1);
                })
                .style("fill", function (d) {
                    return colors(d.response);
                });

            // position the legend elements
            var legend = svglegend.selectAll(".legend")
                .data(colors.domain())
                .enter().append("g")
                .attr("class", "legend");

            legend.append("rect")
                .attr("width", 18)
                .attr("height", 18)
                .attr("class", "tralala")
                .style("fill", colors);

            legend.append("text")
                .attr("y", 9)
                .attr("dy", ".35em")
                .style("text-anchor", "start")
                .attr("transform", "translate(23,0)")
                .attr("id", function (d, i) {
                    return "text " + i;
                })
                .text(function (d) {
                    return d;
                });

            var x_pos = 0;
            var distance = 32;

            // Legende: Rects nach textlänge neu positionieren
            svglegend.selectAll("rect")
                .attr("x", function (d, i) {
                    var rect_pos = x_pos;
                    x_pos = x_pos + document.getElementById("text " + i).getBBox().width + distance;
                    return rect_pos;
                });

            x_pos = 0;

            // Legende: Text nach textlänge neu positionieren
            svglegend.selectAll("text")
                .attr("x", function (d, i) {
                    var text_pos = x_pos;
                    x_pos = x_pos + document.getElementById("text " + i).getBBox().width + distance;
                    return text_pos;
                });

            // animation
            d3.selectAll("input").on("change", handleFormClick);

            function handleFormClick() {
                if (this.value === "bypercent") {
                    transitionPercent();
                } else {
                    transitionCount();
                }
            }

            // transition to 'percent' presentation
            function transitionPercent() {
                // reset the yscale domain to default
                yscale.domain([0, 1]);

                // create the transition
                var trans = svg.transition().duration(250);

                // transition the bars
                var categories = trans.selectAll(".category");
                categories.selectAll("rect")
                    .attr("y", function (d) {
                        return yscale(d.yp1);
                    })
                    .attr("height", function (d) {
                        return yscale(d.yp0) - yscale(d.yp1);
                    });

                // change the y-axis
                // set the y axis tick format
                yaxis.tickFormat(d3.format(".0%"));
                svg.selectAll(".y.axis").call(yaxis);
            }

            // transition to 'count' presentation
            function transitionCount() {
                // set the yscale domain
                yscale.domain([0, d3.max(parsedata, function (d) {
                    return d.totalresponses;
                })]);

                // create the transition
                var transone = svg.transition()
                    .duration(250);

                // transition the bars (step one)
                var categoriesone = transone.selectAll(".category");
                categoriesone.selectAll("rect")
                    .attr("y", function (d) {
                        return this.getBBox().y + this.getBBox().height - (yscale(d.y0) - yscale(d.y1))
                    })
                    .attr("height", function (d) {
                        return yscale(d.y0) - yscale(d.y1);
                    });

                // transition the bars (step two)
                var transtwo = transone.transition()
                    .delay(350)
                    .duration(350)
                    .ease("bounce");
                var categoriestwo = transtwo.selectAll(".category");
                categoriestwo.selectAll("rect")
                    .attr("y", function (d) {
                        return yscale(d.y1);
                    });

                // change the y-axis
                // set the y axis tick format
                yaxis.tickFormat(d3.format(".2s"));
                svg.selectAll(".y.axis").call(yaxis);
            }

            console.log(parsedata);

            // Sortierreihenfolge ändern
            d3.selectAll(".sort").on("click", handleSort);

            function handleSort() {
                d3.selectAll(".sort").attr("class", "sort btn btn-default btn-xs");
                d3.select(this).attr("class", "sort btn btn-primary btn-xs");

                // Nach gewähltem Parameter sortieren
                // Ansatz von: https://bl.ocks.org/mbostock/3885705
                var that = this
                var x0 = xscale.domain(
                        (function () {
                            switch (that.id) {
                                // Wähleranteil
                                case "sort1":
                                    return parsedata.sort(function (a, b) {
                                        return (b.sitze - a.sitze) || (b["Base: All Respondents"] - a["Base: All Respondents"]);
                                    })
                                    // Anzahl Antworten
                                case "sort2":
                                    return parsedata.sort(function (a, b) {
                                        return (b["Base: All Respondents"] - a["Base: All Respondents"]);
                                    })
                                    // Durchschnitt
                                case "sort3":
                                    return parsedata.sort(function (a, b) {
                                        return b.durchschnitt - a.durchschnitt;
                                    })
                                    // Nein resp deutlich weniger
                                case "sort4":
                                    return parsedata.sort(function (a, b) {
                                        return (b.responses[0].yp1 - a.responses[0].yp1) || ((b.responses[1].yp1 - b.responses[1].yp0) - (a.responses[1].yp1 - a.responses[1].yp0)) || ((b.responses[2].yp1 - b.responses[2].yp0) - (a.responses[2].yp1 - a.responses[2].yp0)) || ((b.responses[3].yp1 - b.responses[3].yp0) - (a.responses[3].yp1 - a.responses[3].yp0));
                                    })
                                    // Ja resp deutlich mehr
                                case "sort5":
                                    if (!budgetfrage) {
                                        return parsedata.sort(function (a, b) {
                                            return ((b.responses[3].yp1 - b.responses[3].yp0) - (a.responses[3].yp1 - a.responses[3].yp0)) || ((b.responses[2].yp1 - b.responses[2].yp0) - (a.responses[2].yp1 - a.responses[2].yp0)) || ((b.responses[1].yp1 - b.responses[1].yp0) - (a.responses[1].yp1 - a.responses[1].yp0));
                                        })
                                    } else {
                                        return parsedata.sort(function (a, b) {
                                            return ((b.responses[4].yp1 - b.responses[4].yp0) - (a.responses[4].yp1 - a.responses[4].yp0)) || ((b.responses[3].yp1 - b.responses[3].yp0) - (a.responses[3].yp1 - a.responses[3].yp0)) || ((b.responses[2].yp1 - b.responses[2].yp0) - (a.responses[2].yp1 - a.responses[2].yp0)) || ((b.responses[1].yp1 - b.responses[1].yp0) - (a.responses[1].yp1 - a.responses[1].yp0));
                                        })
                                    }
                            }
                        })()
                        .map(function (d) {
                            return d.Absolutes;
                        }))
                    .copy();

                svg.selectAll(".category")
                    .sort(function (a, b) {
                        return x0(a.Absolutes) - x0(b.Absolutes);
                    });

                var transition = svg.transition().duration(750),
                    delay = function (d, i) {
                        return i * 50;
                    };

                transition.selectAll(".category")
                    .delay(delay)
                    .attr("transform", function (d) {
                        return "translate(" + xscale(d.Absolutes) + ",0)";
                    });

                transition.select(".x.axis")
                    .call(xaxis)
                    .selectAll("g")
                    .delay(delay)
                    .selectAll("text")
                    .attr("y", 5)
                    .attr("x", 7)
                    .attr("dy", ".35em")
                    .attr("transform", "rotate(65)")
                    .style("text-anchor", "start")
            }

        });
    });

    d3.select(self.frameElement).style("height", (height + margin.top + margin.bottom) + "px");
};


jQuery(function ($) {

    $("#category").on("click", "a", function () {
        $("#category li").removeClass("active");
        $(this).parent('li').addClass("active");
        $("#chart").empty();
        $("#questions").empty();
        $('#check').prop('checked', true);
        $('#selected_category').html($(this).text())
        displayquestions($("#category .active").attr('id'));
    });

    $("#questions").on("click", "li", function () {
        $("#questions li").attr("class", "list-group-item small");
        $(this).attr("class", "list-group-item small active");
        $("#chart").empty();
        $('#check').prop('checked', true);
        load_barchart($(this).attr("id"));
    });

    $("#gender").on("click", "button", function () {
        $("#gender button").attr("class", "btn btn-default btn-xs");
        $(this).attr("class", "btn btn-primary btn-xs");
        $("#chart").empty();
        $('#check').prop('checked', true);
        load_barchart($("#questions .active").attr('id'))
    });

    $("#elected").on("click", "button", function () {
        $("#elected button").attr("class", "btn btn-default btn-xs");
        $(this).attr("class", "btn btn-primary btn-xs");
        $("#chart").empty();
        $('#check').prop('checked', true);
        load_barchart($("#questions .active").attr('id'))
    });

    $(document).on("mouseup", ".slider-handle", function () {
        $("#max_age").text(Math.max($(".max-slider-handle").attr("aria-valuenow")));
        $("#min_age").text(Math.max($(".min-slider-handle").attr("aria-valuenow")));
        $("#chart").empty();
        $('#check').prop('checked', true);
        load_barchart($("#questions .active").attr('id'))
    });

    var resizeId;
    $(window).resize(function () {
        clearTimeout(resizeId);
        resizeId = setTimeout(function () {
            $("#chart").empty();
            $('#check').prop('checked', true);
            load_barchart($("#questions .active").attr('id'))
        }, 500);
    });

});
