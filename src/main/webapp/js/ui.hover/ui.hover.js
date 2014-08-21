(function( $, undefined ) {

const
    MSG_NOT_SUPPORTED = 'Need browser with canvas support',
    MSG_AREA_ALT = 'Switch area',
    MSG_START = '... loading ...',
    MSG_READY = 'ready',
    MSG_NO_MARKER = 'No markers detected',
    MSG_BAD_PERSPECTIVE = 'Bad marker perspective',
    MSG_DM = "dm",

    MSG_NEXT_MARKER = 'Next marker',
    MSG_TOGGLE_SELECTION = 'Select/deselect all',
    MSG_NEXT_COLOR = 'Choose selection highlite color',
    MSG_TOGGLE_MESH = 'Show/hide mesh',
    MSG_SHIFT_MESH = 'Shift mesh',
    MSG_RESIZE_MESH = 'Resize mesh',
    MSG_RESET_MESH = 'Reset mesh',
    MSG_SEND = 'Save',
    MSG_REUPLOAD = 'Change photo',

    // Canvas can be shifted by 1/3 of its original size
    DELTA = 0.4,
    // Ignore area which has any size lowest the specified
    MIN_AREA_SIZE = 10,
    // Ignore areas which hits view within this padding
    BORDER_PROXIMITY = 5,
    // Restrict mesh lines amount from each marker side
    MAX_PARALEL_LINES = 100,
    MAX_VANISH_LINES = 50,
    // Ignore vanishing lines which angle with base marker line more then specified
    MAX_ANGLE = Math.PI / 3,
    // 1, 1/2, 1/4, etc.
    MIN_SCALE = 1/2;

const
    _IMG_TRANSPARENT = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',

    _LEFT = 'LEFT',
    _RIGHT = 'right',
    _TOP = 'top',
    _BOTTOM = 'bottom',
    _PANEL_SIZE = 42,
    _STATUS_HEIGHT = 18,

    _CSS_NO_BORDER = { border: '0px !important', padding: '0px !important', margin: '0px !important' },
    _CSS_STATUS = {
        backgroundColor: '#333333', // border: 'thin solid white',
        color: 'white',
        position: 'absolute', left: 0, height: _STATUS_HEIGHT, minHeight: _STATUS_HEIGHT,
        padingTop: 4,
        fontFamily: 'Courier', fontSize: '13px', textAlign: 'center', verticalAlign: 'middle'
    }
;

$.widget( 'ui.hover', {

    _markerIndex: 0,
    _markers: [],
    _marker: [],
    _fillColorIndex: 0,

    options: {
        version: '1.0.0',
        debug: false,
        square: 1,
        image: {
            src: _IMG_TRANSPARENT, width: 400, height: 400, alt: 'Photo'
        },
        widget: {
            background: 'white',
            renderBorder: true,
            border: 'thin solid black'
        },
        mesh: {
            border: 'white',
            color: 'yellow'
        },
        marker: {
            square: 1,
            border: 'blue',
            markerBorderWidth: 2,
            fills: [
                'RGBA(0, 180, 180, 0.5)',
                'RGBA(255, 0, 0, 0.5)',
                'RGBA(200, 180, 0, 0.5)',
                'RGBA(0, 0, 255, 0.5)'
            ]
        },
        panel: {
            align: _TOP,
            background: '#FFFF80'
        },
        button: {
            background: 'white',
            shadowColor: "black"
        }
     },

    // creates html components
    _create: function() {
        var me = this;
        me._id = me.element.attr('id') + '_hover_';

        me._w = me.options.image.width;
        me._h = me.options.image.height;

        me._scale = 1;
        me._translate = { left: 0, top: 0 };

        me._horizontalPanel = me.options.panel.align == _TOP || me.options.panel.align == _BOTTOM;
        var topPanel = me._horizontalPanel && me.options.panel.align == _TOP,
            leftPanel = !me._horizontalPanel && me.options.panel.align != _RIGHT;
        me._top  = me._horizontalPanel && topPanel? _PANEL_SIZE : 0;
        me._left = !me._horizontalPanel && leftPanel? _PANEL_SIZE : 0;

        me._canvas = $('<canvas/>')
            .attr('id', me._id + 'canvas')
            .attr('width', me._w)
            .attr('height', me._h)
            .text(MSG_NOT_SUPPORTED)
            .css(_CSS_NO_BORDER)
            .css({ position: 'absolute', left: me._left, top: me._top, zIndex: 10, overflow: 'visible' })
            .mousedown(function(event) {
                if (me._shifting)
                    me._dragStart(event.pageX, event.pageY);
//                else if (me._scaling)
//                    me._scaleStart(event.pageX, event.pageY);
            })
            .mousemove(function(event) {
                if (me._shifting)
                    me._dragStep(event.pageX, event.pageY);
//                else if (me._scaling)
//                    me._scaleStep(event.pageX, event.pageY);
            })
            .mouseup(function() {
                if (me._shifting)
                    me._dragStop();
//                else if (me._scaling)
//                    me._scaleStop();
            })
            .mouseout(function() {
                if (me._shifting)
                    me._dragStop();
//                else if (me._scaling)
//                    me._scaleStop();
            });
        me._touch = $('<img border="0" alt=""/>')
            .attr('id', me._id + 'touch')
            .attr('src', _IMG_TRANSPARENT)
            .attr('width', me._w * (1 + 2 * DELTA))
            .attr('height', me._h * (1 + 2 * DELTA))
            .attr('usemap', '#' + me._id + 'map')
            .css(_CSS_NO_BORDER)
            .css({ position: 'absolute',
                left: me._left - me._w * DELTA,
                top:  me._top - me._h * DELTA,
                zIndex: 20
            });
        me._map = $('<map/>')
            .attr('id', me._id + 'map')
            .attr('name', me._id + 'map');

        var panelLeft = !me._horizontalPanel && !leftPanel? me._w : 0,
            panelTop = me._horizontalPanel && !topPanel? me._h : 0,
            panelWidth = me._horizontalPanel? me._w : _PANEL_SIZE,
            panelHeight = !me._horizontalPanel? me._h : _PANEL_SIZE,
            css = { position: 'absolute', left: panelLeft, top: panelTop, width: panelWidth, height: panelHeight };
        var panel = $('<canvas/>')
            .attr('id', me._id + 'panel')
            .attr('width', panelWidth)
            .attr('height', panelHeight)
            .css(_CSS_NO_BORDER)
            .css(css)
            .css({
                zIndex: 30,
                background: me.options.panel.background
            });
        var panelTouch = $('<img alt="" border="0"/>')
            .attr('id', me._id + 'panelTouch')
            .attr('src', _IMG_TRANSPARENT)
            .attr('width', panelWidth)
            .attr('height', panelHeight)
            .attr('usemap', '#' + me._id + 'panelMap')
            .css(_CSS_NO_BORDER)
            .css(css)
            .css({ zIndex: 40 });
        me._panelMap = $('<map/>')
            .attr('id', me._id + 'panelMap')
            .attr('name', me._id + 'panelMap');

        var width = me._horizontalPanel? me._w : me._w + _PANEL_SIZE,
            height = !me._horizontalPanel? me._h : me._h + _PANEL_SIZE;
        me._status = $('<div/>')
            .attr('id', me._id + 'status')
            .attr('width', width)
            .attr('height', _STATUS_HEIGHT)
            .css(_CSS_STATUS)
            .css({ top: height, minWidth: width, width: width, zIndex: 1000 });

        var backHPos = !me._horizontalPanel && leftPanel? 'right' : 'left',
            backVPos = me._horizontalPanel && topPanel? _PANEL_SIZE + 'px' : 'top';
        me.element.empty()
            .css(me.options.debug? {
                position: 'relative'
            } : {
                position: 'absolute', overflow: 'hidden',
                top: '50%', left: '50%',
                marginLeft: -width / 2,
                marginTop: -(_STATUS_HEIGHT + height) / 2
            })
            .css({
                backgroundColor: me.options.widget.background,
                backgroundImage: 'url(' + me.options.image.src + ')',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: backHPos + ' ' + backVPos,
                border: me.options.widget.border,
            })
            .width(width)
            .height(height + _STATUS_HEIGHT);

        me.element.append([
            me._canvas, me._touch, me._map,
            panel, panelTouch, me._panelMap,
            me._status
        ]);

        me._context = document.getElementById(me._id + 'canvas').getContext('2d');
        me._panel = document.getElementById(me._id + 'panel').getContext('2d');

        me.status(MSG_START);
    },

    // perform calculations and rendering
    markers: function(markers) {
        var me = this;

        var found = markers && markers.length > 0,
            text = (found? markers.length : "no") +
                " marker" + (found && markers.length == 1 ? "" : "s") +
                " found";
        me.status(text);
        if (!found)
            return;

        me._scaleMarkers(markers);
        me._markers = markers;
        me._markerIndex = 0;
        me._resize = 1;
        me._selectMarker();
        me._render();
    },

    _scaleMarkers: function(markers) {
        var me = this;
        var ratio = me.options.image.ratio;
        if (!ratio)
            return;
        $.each(markers, function(index, marker) {
            $.each(marker.points, function(index, point) {
                point.x = point.x / ratio;
                point.y = point.y / ratio;
            });
        });
    },

    _render: function() {
        var me = this;
        me._clear();
        me._calculateMesh();
        me._calculateAreas();

        me._renderMesh();
        me._renderBorders();
        me._renderMarker();
        me._renderAreas();
        me._renderPanel();
        me._renderSelectedCount();
    },

    _clear: function() {
        var me = this;
        me._context.save();
        me._context.setTransform(1, 0, 0, 1, 0, 0);
        me._context.clearRect(0, 0, me._w, me._h);
        me._context.restore();
    },

    _selectMarker: function() {
        var me = this;
        if (!me._markers[me._markerIndex])
            me._markerIndex = 0;

        me._marker = me._markers[me._markerIndex].points;
    },

    nextMarker: function(index) {
        var me = this;
        me._saveSelection();
        me._markerIndex++;
        me._selectMarker();
        me._render();
        me._restoreSelection();
    },

    // calculates grid
    _calculateMesh: function() {
        var me = this;
        // base lines are marker borders
        var m = me._marker;
        var vLine1 = __line(m[0], m[1]),
            vLine2 = __line(m[3], m[2]),
            hLine1 = __line(m[1], m[2]),
            hLine2 = __line(m[0], m[3]);
        // they form two vanishing points
        var vanishV = __cross(vLine1, vLine2),
            vanishH = __cross(hLine1, hLine2);
        if (vanishV && vanishH && me._insideVisible([vanishV]) && me._insideVisible([vanishH]))
            me.status(MSG_BAD_PERSPECTIVE);

        // rendering area (0,0)-(w,h)
        // surronunded by extra areas for moving
        var minX = -me._w * DELTA, maxX = me._w * (1 + DELTA),
            minY = -me._h * DELTA, maxY = me._h * (1 + DELTA);
        me._borders = [
            __line({x: minX, y: minY}, {x: maxX, y: minY}),
            __line({x: minX, y: minY}, {x: minX, y: maxY}),
            __line({x: minX, y: maxY}, {x: maxX, y: maxY}),
            __line({x: maxX, y: minY}, {x: maxX, y: maxY})
        ];

        var vLinesNeg, vLinesPos, hLinesNeg, hLinesPos;
        if (vanishV) {
            vLinesNeg = me._getVanishLines(hLine1, vanishV, false, vanishH);
            vLinesPos = me._getVanishLines(hLine1, vanishV, true, vanishH);
        } else {
            vLinesNeg = me._getParallelLines(hLine1, vLine1, false, vanishH);
            vLinesPos = me._getParallelLines(hLine1, vLine1, true, vanishH);
        }
        if (vanishH) {
            hLinesNeg = me._getVanishLines(vLine1, vanishH, false, vanishV);
            hLinesPos = me._getVanishLines(vLine1, vanishH, true, vanishV);
        } else {
            hLinesNeg = me._getParallelLines(vLine1, hLine1, false, vanishV);
            hLinesPos = me._getParallelLines(vLine1, hLine1, true, vanishV);
        }

        me._vLines = $.merge($.merge([], vLinesNeg.reverse()), vLinesPos);
        me._hLines = $.merge($.merge([], hLinesNeg.reverse()), hLinesPos);

        me._vanishV = vanishV;
        me._vanishH = vanishH;
    },

    // found all the lines from point to vanishing point that cross the borders
    // point are moved from starting position by vector
    _getVanishLines: function(ort, vanish, direction, vanishO) {
        var me = this;

        var sign = direction? 1 : -1;
        var vector = { x: -sign * ort.a, y: sign * ort.b };
        vector.x = vector.x * me._resize;
        vector.y = vector.y * me._resize;
        var start = direction? ort.pA : __move(ort.pA, vector);
        return me._getLines(start, vanish, vector, false, vanishO);
    },

    // found all the lines from point to end point, both moved by vector
    _getParallelLines: function(ort, base, direction, vanishO) {
        var me = this;

        var sign = direction? 1 : -1;
        var vector = { x: -sign * ort.a, y: sign * ort.b };
        vector.x = vector.x * me._resize;
        vector.y = vector.y * me._resize;
        var start = direction? ort.pA : __move(ort.pA, vector);
        var end = __move(start, {x: base.a, y: -base.b});

        return me._getLines(start, end, vector, true, vanishO);
    },

    _getLines: function(start, end, vector, moveEnd, vanish) {
        var me = this;
        var lines = [],
            i = 0,
            hit = true,
            origin = __line(start, end);

        while (hit && i++ < (moveEnd? MAX_PARALEL_LINES : MAX_VANISH_LINES)) {
            var line = __line(start, end);
            hit = false;
            $.each(me._borders, function() {
                var cross = __crossSegment(line, this);
                if (cross) {
                    if (hit)
                        line.pB = cross;
                    else
                        line.pA = cross;
                    hit = true;
                }
            });
            var oldStart = start;
            if (hit) { // optimization, !hit => last iteration
                start = __move(start, vector);
                if (moveEnd)
                    end = __move(end, vector);
            }
            // check if next line will cross vanish
            if (vanish) {
                var delta = __line(oldStart, start);
                if (__pointOnLine(vanish, delta))
                    hit = false;
            }
            var c1 = origin.vertical? Math.PI / 2 : Math.atan(origin.k);
            var c2 = line.vertical? Math.PI / 2 : Math.atan(line.k);
            if (!origin.vertical && !line.vertical) {
                var dk = Math.abs(c1) - Math.abs(c2);
                if (dk > MAX_ANGLE)
                    hit = false;
            }
            // last line put into the array actually doesn't hit borders,
            // but is used to calculate partial areas
            lines.push(line);
        }
        return lines;
    },

    _calculateAreas: function() {
        var me = this;
        me._areas = [];
        me._map.empty();

        var i = 0, j = 0;
        var hLineA, hLineB, vLineA, vLineB;
        $.each(me._hLines, function() {
            if (hLineA) {
                hLineB = this;
                $.each(me._vLines, function() {
                    if (vLineA) {
                        vLineB = this;
                        var area = {
                            index: i + "-" + j,
                            points: [
                                __cross(hLineA, vLineA),
                                __cross(vLineA, hLineB),
                                __cross(hLineB, vLineB),
                                __cross(vLineB, hLineA)
                            ],
                            state: false
                        };
                        var small =
                            __length(area.points[0], area.points[1]) < MIN_AREA_SIZE ||
                            __length(area.points[1], area.points[2]) < MIN_AREA_SIZE ||
                            __length(area.points[2], area.points[3]) < MIN_AREA_SIZE ||
                            __length(area.points[3], area.points[0]) < MIN_AREA_SIZE;

                        if (!small && me._inside(area.points))
                            me._areas.push(area);
                    }
                    j++;
                    vLineA = this;
                });
            }
            i++;
            j = 0;
            hLineA = this;
            vLineA = null;
        });
    },

    _inside: function(points) {
        var me = this;
        var min = { x: -me._w * DELTA + BORDER_PROXIMITY, y: -me._h * DELTA + BORDER_PROXIMITY },
            max = { x: me._w * (1 + DELTA) - BORDER_PROXIMITY, y: me._h * (1 + DELTA) - BORDER_PROXIMITY };
        return __inside(points, min, max);
    },

    _insideVisible: function(points) {
        var me = this;
        var min = { x: -BORDER_PROXIMITY, y: -BORDER_PROXIMITY },
            max = { x: me._w - BORDER_PROXIMITY, y: me._h - BORDER_PROXIMITY };
        return __inside(points, min, max);
    },

    _renderAreas: function() {
        var me = this;
        me._map.empty();
        var offset = {
            x: me._left - me._w * DELTA,
            y: -me._h * DELTA
        };
        $.each(me._areas, function() {
            me._renderArea(me._map, this.points, "'" + this.index + "'", 'clickArea', MSG_AREA_ALT, offset);
        });

    },

    _renderArea: function(map, zone, params, operation, alt, offset) {
        var me = this;
        var coords = '';
        $.each(zone, function() {
            var x = offset? this.x - offset.x : this.x;
            var y = offset? this.y - offset.y : this.y;
            coords += x + "," + y + ","
        });
        if (coords.length > 0)
            coords = coords.substring(0, coords.length - 1);
        var href = "javascript:$('#" + me.element.attr('id') + "').data('ui-hover')." + operation + "(" + params + ")";
        var area = $('<area/>')
            .attr('shape', 'poly')
            .attr('href', href)
            .attr('alt', alt)
            .attr('title', alt)
            .attr('coords', coords);
        map.append(area);
    },

    _saveSelection: function() {
        var me = this;
        var selection = [];
        $.each(me._areas, function(index, area) {
            if (area.state)
                selection.push(index);
        });
        if (!me._selection)
            me._selection = [];
        me._selection[me._markerIndex] = selection;
    },

    _restoreSelection: function() {
        var me = this;
        var selection = me._selection && me._selection[me._markerIndex];
        if (!selection)
            return;
        $.each(selection, function(index, areaIndex) {
            var area = me._areas[areaIndex];
            area.state = true;
            me._fillArea(area);
        });
        me._renderSelectedCount();
    },

    _emptySelection: function() {
        var me = this;
        me._selection = [];
    },

    countAreas: function() {
        var me = this;
        var count = 0;
        $.each(me._areas, function() {
            if (this.state)
                count++;
        });
        return count;
    },

    getSelectedSquare: function() {
        var me = this;
        return "" + me.countAreas() * (me._resize * me._resize) * me.options.marker.square;
    },

    _renderSelectedCount: function() {
        var me = this;
        var context = me._panel;
        __resetShadow(context);
        context.fillStyle = 'black';

        context.clearRect(1, 1, _PANEL_SIZE - 2, 30);

        context.font = "9px Verdana";
        context.textBaseLine = 'center';
        var square = me.getSelectedSquare();
        var width = context.measureText(square).width;
        var left = (_PANEL_SIZE - width) / 2;
        var top = me._horizontalPanel? 18 : 16;
        context.fillText(square, left, top);
        context.fillText(MSG_DM, 13, top + 13);

        var offset = context.measureText(MSG_DM).width;
        context.font = "7px Verdana";
        context.textBaseLine = 'top';
        context.fillText('2', 13 + offset, top + 10);
    },

    sendSelection: function() {
        var me = this;
        var areas = [];
        var ratio = me.options.image.ratio;
        $.each(me._areas, function(index, area) {
            if (!area.state)
                return;
            var points = [];
            if (!ratio || ratio == 1)
                points = area.points;
            else
                $.each(area.points, function(index, point) {
                    points.push({
                        x: Math.round(point.x * ratio),
                        y: Math.round(point.y * ratio)
                    })
                });
            areas.push({ id: area.index, points: points});
        });
        var result = {
            square: me.getSelectedSquare(),
            areas: areas
        };
        // fixme: send result
        alert(JSON.stringify(result));
    },

    clickArea: function(index) {
        var me = this;
        var area;
        var i = 0;
        while (!area && i < me._areas.length) {
            if (me._areas[i].index == index)
                area = me._areas[i];
            i++;
        }
        area.state = !area.state;
        me._fillArea(area);
        me._renderSelectedCount();
        me._renderMarker();
    },

    _redrawAllAreas: function() {
        var me = this;
        $.each(me._areas, function() {
            if (this.state) {
                this.state = false;
                me._fillArea(this);
                this.state = true;
                me._fillArea(this);
            }
        });
        me._renderMarker();
    },

    // if state is passed, set it to each visible area
    _toggleAllAreas: function(state) {
        var me = this;
        $.each(me._areas, function() {
            if (!state || me._insideVisible(this.points)) {
                this.state = state;
                me._fillArea(this);
            }
        });
        me._renderMarker();
        me._renderSelectedCount();
    },

    _fillArea: function(area) {
        var me = this;
        var context = me._context;
        var last = area.points[area.points.length - 1];
        context.beginPath();
        context.moveTo(last.x, last.y);
        $.each(area.points, function() {
            context.lineTo(this.x, this.y);
        });
        context.closePath();

        if (!me._fillColorIndex) me._fillColorIndex = 0;
        var color = me.options.marker.fills[me._fillColorIndex];

        context.globalCompositeOperation = area.state? 'source-over' : 'destination-out';
        context.fillStyle = area.state? color : 'white';
        context.fill();
        if (!area.state) {
            context.globalCompositeOperation = 'source-over';
            context.globalAlpha = 0.5;
            context.strokeStyle = me.options.mesh.color;
            context.strokeWidth = 1;
            context.stroke();
            context.globalAlpha = 1;
        }
    },

    _renderBorders: function() {
        var me = this;
        if (me.options.widget.renderBorder) {
            me._context.save();
            me._context.setTransform(1, 0, 0, 1, 0, 0);

            me._context.strokeStyle = me.options.widget.border;

            me._context.beginPath();
            me._context.moveTo(0, 0);
            me._context.lineTo(0, me._h);
            me._context.lineTo(me._w, me._h);
            me._context.lineTo(me._w, 0);
            me._context.closePath();
            me._context.stroke();

            me._context.restore();
        }
    },

    _renderMarker: function() {
        var me = this;
        var context = me._context;
        var last = me._marker[me._marker.length - 1];

        context.strokeStyle = me.options.marker.border;
        context.lineWidth = me.options.marker.borderWidth;
        context.beginPath();
        context.moveTo(last.x, last.y);
        $.each(me._marker, function() {
            context.lineTo(this.x, this.y);
        });
        context.closePath();
        context.stroke();
    },

    _renderMesh: function() {
        var me = this;
        me._context.strokeStyle = me.options.mesh.color;

        var first, last;

        first = me._hLines[0];
        last = me._hLines[me._hLines.length - 1];
        $.each(me._vLines, function() {
            me._renderLine(this, first, last);
        });

        first = me._vLines[0];
        last = me._vLines[me._vLines.length - 1];
        $.each(me._hLines, function() {
            me._renderLine(this, first, last);
        });
    },

    // render line passed, its, visible segment restricted by horizontal axises
    // render canvas twice as big, because of moving
    _renderLine: function(line, first, last, color) {
        var me = this;
        var pA, pB;
        if (first && last) {
            if (__parallel(line, first) || __parallel(line, last))
                return;
            pA = __cross(line, first);
            pB = __cross(line, last);
        }
//        if (!pA || !pB) {
//            if (line.vertical) {
//                var minY = -me._h * DELTA, maxY = me._h * (1 + DELTA);
//                var x = __lineX(line, 0); // x == const because line is vertical
//                pA = { x: x, y: minY };
//                pB = { x: x, y: maxY };
//            } else {
//                var minX = -me._w * DELTA, maxX = me._w * (1 + DELTA);
//                pA = { x: minX, y: __lineY(line, minX) };
//                pB = { x: maxX, y: __lineY(line, maxX) };
//            }
//        }
        //console.debug(pA.x + ", " + pA.y + " - " + pB.x + ", " + pB.y);
        me._renderSegment({ pA: pA, pB: pB }, color);
    },

    _renderSegment: function(line, color) {
        var me = this;
        if (color)
            me._context.strokeStyle = color;
        me._context.beginPath();
        me._context.moveTo(line.pA.x, line.pA.y);
        me._context.lineTo(line.pB.x, line.pB.y);
        me._context.closePath();
        me._context.stroke();
    },

    _BUTTONS: [
        { name: 'marker',  src: 'img/btn_marker.png',  alt: MSG_NEXT_MARKER,       callback: 'nextMarker',
            checkVisible: function(me) { return me._markers.length > 1; } },
        { name: 'select',  src: 'img/btn_select.png',   alt: MSG_TOGGLE_SELECTION, callback: 'toggleSelection' },
        { name: 'palette', src: 'img/btn_palette.png',  alt: MSG_NEXT_COLOR,       callback: 'selectionColor' },
        { name: 'show',    src: 'img/btn_show.png',     alt: MSG_TOGGLE_MESH,      callback: 'toggleMesh' },
        { name: 'shift',   src: 'img/btn_shift.png',    alt: MSG_SHIFT_MESH,       callback: 'toggleShift' },
        { name: 'resize',                               alt: MSG_RESIZE_MESH,      callback: 'toggleResize',
            render: function(me, left, top, size) { me._renderResizeButton(this, left, top, size); }},
        { name: 'reset',   src: 'img/btn_reset.png',    alt: MSG_RESET_MESH,       callback: 'resetMesh' },
        { name: 'send',    src: 'img/btn_send.png',     alt: MSG_SEND,             callback: 'sendSelection' },
        { name: 'reimage', src: 'img/btn_newphoto.png', alt: MSG_REUPLOAD,         callback: 'chooseImage' }
    ],

    _renderPanel: function() {
        var me = this;

        var width = me._panel.canvas.width,
            height = me._panel.canvas.height;

        // panel background
        var gradient = me._horizontalPanel?
            me._panel.createLinearGradient(0, height / 2, width * 1.5, height / 2) :
            me._panel.createLinearGradient(width / 2, 0, width / 2, height * 1.5);
        gradient.addColorStop(0.000, me.options.panel.background);
        gradient.addColorStop(1.000, 'rgba(255, 255, 255, 1.000)');
        me._panel.fillStyle = gradient;
        me._panel.fillRect(0, 0, width, height);

        // buttons
        me._panel.strokeStyle = 'black';
        me._panel.srokeWidth = 1;
        me._panel.fillStyle = me.options.button.background;
        me._panel.shadowColor = me.options.button.shadowColor;
        me._panel.shadowBlur = 1;
        me._panel.shadowOffsetX = 1;
        me._panel.shadowOffsetY = 1;

        var i = 0;
        $.each(me._BUTTONS, function(index, button) {
            var hide = button.checkVisible && !button.checkVisible(me);
            if (!hide) {
                button.position = i++;
                me._renderButton(index);
            }
        });
    },

    _renderButton: function(index) {
        var me = this;
        var button = me._BUTTONS[index];
        var size = _PANEL_SIZE - 13,
            off = button.position * (size + 10),
            top = me._horizontalPanel? 6: 38 + off,
            left = me._horizontalPanel? 42 + off : 6;

        me._panel.beginPath();
        me._panel.rect(left - 1, top - 1, size + 2, size + 2);
        me._panel.fill();

        if (button.src) {
            var img = new Image();
            img.onload = function() {
                me._panel.drawImage(img, left, top, size, size);
                if (button.state) {
                    var data = me._panel.getImageData(left, top, size, size);
                    data = me._invertImage(data);
                    me._panel.putImageData(data, left, top);
                }

            };
            img.src = button.src;
        }
        if (button.render) {
            me._panel.save();
            button.render(me, left, top, size);
            me._panel.restore();
        }

        var points = [
            {x: left, y: top},
            {x: left + size, y: top},
            {x: left + size, y: top + size},
            {x: left, y: top + size}
        ];
        me._renderArea(me._panelMap, points, index, button.callback, button.alt);
    },

    _invertImage: function(data) {
        for (var i = 0; i < data.data.length; i += 4) {
            // invert everything but red channel
            data.data[i]     = data.data[i]; // R
            data.data[i + 1] = 255 - data.data[i + 1]; // G
            data.data[i + 2] = 255 - data.data[i + 2]; // B
            data.data[i + 3] = 255; // Alpha
        }
        return data;
    },

    toggleSelection: function() {
        var me = this;
        var selected = me.countAreas();
        me._toggleAllAreas(selected == 0);
    },

    selectionColor: function(index) {
        var me = this;

        // todo: button color as background
        //me._panel.fillStyle = me.options.marker.fills[me._fillColorIndex];
        //me._renderButton(index);

        var toggled = [];

        // firstly we must remove current fill, because it's partially transparent,
        // so drawing over it will multiply colors
        // so we uncheck element and so redraw it
        // it must be done with the original color
        $.each(me._areas, function() {
            if (this.state) {
                toggled.push(this);
                this.state = false;
                me._fillArea(this);
            }
        });
        // now we can change color and redraw
        if (++me._fillColorIndex >= me.options.marker.fills.length)
            me._fillColorIndex = 0;

        $.each(toggled, function() {
            // now we can fill it with the new color
            this.state = true;
            me._fillArea(this);

        });

        me._renderMarker();
    },

    toggleMesh: function(index) {
        var me = this;
        me._hiding = !me._hiding;

        me._BUTTONS[index].state = me._hiding;
        me._renderButton(index);

        me._dragStop();
        me._canvas.toggle();
        if (me._hiding || me._shifting)
            me._touch.hide();
        else
            me._touch.show();
    },

    toggleShift: function(index) {
        var me = this;
        if (me._scaling) {
            me.status("Turn off scaling to shift");
            return;
        }

        me._shifting = !me._shifting;

        me._BUTTONS[index].state = me._shifting;
        me._renderButton(index);

        if (me._shifting) {
            me._touch.hide();
            me._canvas.css({cursor: 'move'});
        } else {
            if (!me._hiding)
                me._touch.show();
            me._canvas.css({cursor: 'default'});
        }
    },

    _dragStart: function(x, y) {
        var me = this;
        if (!me._shifting)
            return;

        me._dragging = {
            x: x - me._translate.left,
            y: y - me._translate.top
        };
    },

    _dragStep: function(x, y) {
        var me = this;
        if (!me._dragging)
            return;

        var left = x - me._dragging.x,
            top = y - me._dragging.y;

        left = __shrink(left, me._w * DELTA);
        top = __shrink(top, me._h * DELTA);

        me._translate = { left: left, top: top };

        me._clear();
        me._setCanvasTranslate();

        me._renderMesh();
        me._renderBorders();
        me._renderMarker();
    },

    _dragStop: function() {
        var me = this;
        if (!me._dragging)
            return;

        me._dragging = null;
        me._redrawAllAreas();
        me._setTouchTranslate();
    },

    _setCanvasTranslate: function() {
        var me = this;
        me._context.setTransform(
            me._scale, 0, 0, me._scale, // marker can be already scaled
            me._translate.left, me._translate.top // and moved
        );
    },

    _setTouchTranslate: function() {
        var me = this;
        me._touch.css({
            left: me._left + me._translate.left - me._w * DELTA,
            top:  me._top   + me._translate.top  - me._h * DELTA
        });
    },

    resetMesh: function() {
        var me = this;

        me._hiding = false;
        me._shifting = false;
        me._dragging = false;
        me._scale = 1;
        me._resize = 1;
        me._translate = { left: 0, top: 0 };
        me._setCanvasTranslate();
        me._setTouchTranslate();

        me._canvas.show();
        me._touch.show();
        me._render();

        $.each(me._BUTTONS, function() {
            this.state = false;
        });
        me._renderPanel();
        me._renderSelectedCount();
    },

    toggleResize: function(index) {
        var me = this;
        me._emptySelection();
        me._resize = me._resize / 2;
        if (me._resize < MIN_SCALE)
            me._resize = 1;
        me._renderButton(index);
        me._render();
    },

    _renderResizeButton: function(button, left, top, size) {
        var me = this;

        __resetShadow(me._panel);
        me._panel.fillStyle = 'white';
        me._panel.beginPath();
        me._panel.fillRect(left, top, size, size);

        me._panel.font = "13px Verdana bold";
        me._panel.textBaseLine = 'center';
        me._panel.fillStyle = 'red';

        var text = "1:" + 1 / me._resize / me._resize,
            width = me._panel.measureText(text).width;
        left = left + (size - width) / 2;
        me._panel.fillText(text, left, top + size / 2 + 5);
    },

    chooseImage: function() {
        // select new file: todo, currently reload page
        window.location.reload();
    },
/*
    toggleScale: function(index) {
        var me = this;
        if (me._shifting) {
            me.status("Turn off shifting to scale");
            return;
        }

        me._scaling = !me._scaling;

        me._BUTTONS[index].state = me._scaling;
        me._renderButton(index);

        if (me._scaling) {
            me._touch.hide();
            me._canvas.css({cursor: 'resize'});
        } else {
            if (!me._hiding)
                me._touch.show();
            me._canvas.css({cursor: 'default'});
        }
    },

    _findCenter: function() {
        var me = this;
        var points = me._marker,
            lineA = __line(points[0], points[2]),
            lineB = __line(points[1], points[3]),
            cross = __cross(lineA, lineB);
        return cross;
    },

    _scaleStart: function(x, y) {
        var me = this;
        if (!me._scaling)
            return;

//        me._center = me._findCenter(); // todo: check translation from shifting
//        me._context.translate(me._center.x, me._center.y);
        me._scale = 1;
        me._origin = {x: x, y: y};
    },

    _scaleStep: function(x, y) {
        var me = this;
        if (!me._scaling || !me._origin)
            return;

        var delta = (y - me._origin.y) / me._h * DELTA,
            scale = 1 - delta;
        if (scale > 2)
            scale = 2;
        else if (scale < 0.5)
            scale = 0.5;

        if (scale == me._scale)
            return;
        me._scale = scale;
        console.debug(delta, me._scale);

        me._clear();
        me._setCanvasTranslate();
        me._renderMesh();
        me._renderBorders();
        me._renderMarker();
    },

    _scaleStop: function() {

    },
*/

    status: function(text) {
        var me = this;
        me._status.empty().text(text);
    }

});

function __resetShadow(context) {
    context.shadowBlur = 0;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
    context.shadowColor = 'RGBA(0, 0, 0, 0)';
}

/////// Mathematics ///////

// return point object
function __point(x, y) {
    return { x: x, y: y };
}

function __move(point, vector) {
    return { x: point.x + vector.x, y: point.y + vector.y };
}

function __inside(points, min, max) {
    for (var i = 0; i < points.length; i++) {
        var point = points[i];
        if (point.x > min.x && point.x < max.x &&
            point.y > min.y && point.y < max.y)
            return true;
    }
    return false;
}

// return line object, calculated by segment between two points,
// contains segment itself, canonical and angle formula coefficients
function __line(pA, pB) {
    var a = pB.x - pA.x,
        b = pA.y - pB.y,
        c = pA.x * pB.y - pA.y * pB.x,
        v = __near(pA.x, pB.x, 0.00000001);
    return {
        pA: pA, pB: pB,
        a: a, b: b, c: c, // ay + bx + c = 0
        vertical: v,
        x: v? pA.x : null,
        k: -b/a, d: -c/a // !vertical? y = kx + d
    };
}

// check that two lines are parallel
function __parallel(lA, lB) {
    if (!lA || !lB)
        return null;
    return (lA.vertical && lB.vertical) || lA.k == lB.k;
}

// line parallel with line passed through point
function __linePoint(line, point) {
    var point2 = {
        x: point.x + (line.pB.x - line.pA.x),
        y: point.y + (line.pB.y - line.pA.y)
    };
    return __line(point, point2);
}

// return intersection point for two lines or null
function __cross(lA, lB) {
    if (!lA || !lB)
        return null;
    if (__parallel(lA, lB))
        return null;

    if (lA.vertical)
        return {x: lA.x, y: __lineY(lB, lA.x) };
//        return {x: lA.x, y: lB.k * lA.x + lB.d };
    if (lB.vertical)
        return {x: lB.x, y: __lineY(lA, lB.x) };
//        return {x: lB.x, y: lA.k * lB.x + lA.d };

    var x = (lB.d - lA.d) / (lA.k - lB.k);
    var y = lA.k * x + lA.d;
    return { x: x, y: y };
}

// return intersection point for by lineA within segment of lineB
// only if intersection lies within segment of lineB
function __crossSegment(lA, lB) {
    var cross = __cross(lA, lB);
    if (!cross)
        return null;

    return __pointOnLine(cross, lB);
}

// return X coordinate of line point for another coordinate is given
function __lineX(line, y) {
    return line.vertical?
        line.x:
        (y - line.d) / line.k;
}

// return Y coordinate of line point for another coordinate is given
function __lineY(line, x) {
    return line.vertical? null : line.k * x + line.d;
}

function __length(pointA, pointB) {
    if (!pointA || !pointB)
        return 0;
    return Math.sqrt(
        Math.pow(pointA.x - pointB.x, 2) +
        Math.pow(pointA.y - pointB.y, 2)
    );
}

// point on line within segment
function __pointOnLine(point, line) {
    var minX = line.pA.x < line.pB.x? line.pA.x : line.pB.x;
    var maxX = line.pA.x < line.pB.x? line.pB.x : line.pA.x;
    var minY = line.pA.y < line.pB.y? line.pA.y : line.pB.y;
    var maxY = line.pA.y < line.pB.y? line.pB.y : line.pA.y;
    var hit =
        (point.x >= minX && point.x <= maxX || __near(maxX, minX) && __near(point.x, minX)) &&
        (point.y >= minY && point.y <= maxY || __near(maxY, minY) && __near(point.y, minY));
    return hit? point : null;
}

function __shrink(coord, delta) {
    if (coord > delta) return delta;
    if (coord < -delta) return -delta;
    return coord;
}

function __near(a, b, delta) {
    if (!delta) delta = 0.01;
    return Math.abs(a - b) < delta;
}

})( jQuery );