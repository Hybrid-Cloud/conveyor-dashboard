/**
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */

var conveyorPlanTopology = {
  svg_container: '#conveyor_plan_topology',
  thumbnail_container: '#thumbnail',
  info_box: '#info_box',
  graph: null,
  force: null,
  node: [],
  link: [],
  nodes: [],
  links: [],
  loadingFromJson: function (deps) {
    var self = this;

    var width = $(self.svg_container).width();
    if(width == 0) {width = 700;}
    var height = $(self.svg_container).height();
    if(height == 0) {height = 500;}

    angular.element(self.svg_container).html('');
    angular.element(self.thumbnail_container).find('svg').remove();

    self.graph = deps;
    self.force = d3.layout.force()
      .nodes(self.graph)
      .links([])
      .gravity(0.25)
      .charge(-1200)
      .linkDistance(90)
      .size([width, height])
      .on("tick", function () {
        self.link.attr('d', self.drawLink).style('stroke-width', 3).attr('marker-end', "url(#end)");
        self.node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
      });
    self.svg = d3.select(self.svg_container).append("svg")
      .attr("width", width)
      .attr("height", height);
    self.node = self.svg.selectAll(".node");
    self.link = self.svg.selectAll(".link");
    self.needs_update = false;
    self.nodes = self.force.nodes();
    self.links = self.force.links();
    self.svg.append("svg:clipPath")
             .attr("id","clipCircle")
             .append("svg:circle")
             .attr("cursor","pointer")
              .attr("r", "38px");

  self.svg.append("svg:defs").selectAll("marker")
    .data(["end"])      // Different link/path types can be defined here
  .enter().append("svg:marker")    // This section adds in the arrows
    .attr("id", String)
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 25)
    .attr("refY", 0)
    .attr("fill", "#999")
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
  .append("svg:path")
    .attr("d", "M0,-3L10,0L0,3");

    self.buildLinks();
    self.update();

    self.loadingThumbnail();
  },
  loading: function () {
    var deps = $("#d3_data").data("d3_data");
    this.initPlan(deps);
    this.loadingFromJson(deps);
  },
  loadingThumbnail: function () {
    var self = this;
    //thumbnail
    var thumbnailNodes=[];
    var thumbnailEdges=[];
    for(var i = 0; i < self.nodes.length; i++){
      thumbnailNodes.push({
        'name': self.nodes[i].id
      });
    }
    for(var j =0; j < self.links.length; j++){
      thumbnailEdges.push({
        'source': self.findNodeIndex(self.links[j].source.id),
        'target': self.findNodeIndex(self.links[j].target.id)
      });
    }
    var width = 200;
    var height = 200;
    var svgThumbnail = d3.select(self.thumbnail_container)
      .append("svg")
      .attr("width",width)
      .attr("height",height);
    var forceThumbnail = d3.layout.force()
      .nodes(thumbnailNodes)
      .links(thumbnailEdges)
      .size([width,height])
      .linkDistance(12)
      .charge(-180);
    forceThumbnail.start();

    //add link
    var svg_edges_thumbnail = svgThumbnail.selectAll("line")
      .data(thumbnailEdges)
      .enter()
      .append("line")
      .style("stroke","#999")
      .style("stroke-width",2);

    //add node
    var svg_nodes_thumbnail = svgThumbnail.selectAll("circle")
      .data(thumbnailNodes)
      .enter()
      .append("circle")
      .attr("r",4)
      .style({"fill":"black","cursor":"pointer"})
      .attr("id",function(d){
        return d.name;
      })
      .call(forceThumbnail.drag);
    forceThumbnail.on("tick", function(){
      svg_edges_thumbnail.attr("x1",function(d){ return d.source.x; })
          .attr("y1",function(d){ return d.source.y; })
          .attr("x2",function(d){ return d.target.x; })
          .attr("y2",function(d){ return d.target.y; });
      svg_nodes_thumbnail.attr("cx",function(d){ return d.x; })
          .attr("cy",function(d){ return d.y; });
    });
    $(self.thumbnail_container).find('circle').each(function(i, e){
      $(this).hover(function(){
        $(".thbDetail").html("name:" + $(this).attr("id"));
      },function(){
        $(".thbDetail").html("");
      });
    });
  },
  clearCavens: function () {
    angular.element(self.svg_container).html('');
    angular.element(self.thumbnail_container).find('svg').remove();
  },
  setLoadding: function() {
    var self = this;
    var width = $(self.svg_container).width();
    if(width == 0) {width = 700;}
    var height = $(self.svg_container).height();
    if(height == 0) {height = 500;}
    angular.element(self.svg_container).html('');
    angular.element(self.thumbnail_container).find('svg').remove();
    self.svg = d3.select(self.svg_container).append("svg")
      .attr("width", width)
      .attr("height", height);
    self.vis = self.svg.append('g');
    var load_text = self.vis.append('text')
        .style('fill', 'black')
        .style('font-size', '40')
        .attr('x', '50%')
        .attr('y', '50%')
        .text('');
    var counter = 0;
    var timer = setInterval(function() {
      var i;
      var str = '';
      for (i = 0; i <= counter; i++) {
        str += '.';
      }
      load_text.text(str);
      if (counter >= 9) {
        counter = 0;
      } else {
        counter++;
      }
      if (self.data_loaded) {
        clearInterval(timer);
        load_text.remove();
      }
    }, 100);
  },
  initPlan: function (deps) {
    var planId = $('#id_plan_id').val();
    var dependencies = [];
    for (var index in deps) {
      dependencies.push($.extend(true, {}, deps[index]))
    }
    conveyorPlan.initPlan(planId, dependencies);
  },
  drawLink: function (d) {
    return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
  },
  buildLinks: function (){
    var self = this;
    var nodes = self.nodes;
    for (var i = 0; i < nodes.length; i++){
      self.buildNodeLinks(nodes[i]);
      self.buildReverseLinks(nodes[i]);
    }
  },
  buildNodeLinks: function (node){
    var self = this;
    for (var j = 0; j < node.dependencies.length; j++){
      var push_link = true;
      var target_idx = '';
      var source_idx = self.findNodeIndex(node.id);
      //make sure target node exists
      try {
        target_idx = self.findNodeIndex(node.dependencies[j].id);
      } catch(err) {
        console.log(err);
        push_link =false;
      }
      //check for duplicates
      for (var lidx = 0; lidx < self.links.length; lidx++) {
        if (self.links[lidx].source === source_idx && self.links[lidx].target === target_idx) {
          push_link=false;
          break;
        }
      }
      if (push_link === true && (source_idx && target_idx)){
        self.links.push({
          'target': target_idx,
          'source': source_idx,
          'value': 1,
          'is_cloned': node.dependencies[j].is_cloned || false
        });
      }
    }
  },
  buildReverseLinks: function (node){
    var self = this;
    var nodes = self.nodes;
    for (var i = 0; i < nodes.length; i++){
      if(nodes[i].dependencies){
        for (var j = 0; j < nodes[i].dependencies.length; j++){
          var dependency = nodes[i].dependencies[j];
          //if new node is required by existing node, push new link
          if(node.id === dependency.id){
            self.links.push({
              'target': self.findNodeIndex(node.id),
              'source': self.findNodeIndex(nodes[i].id),
              'value': 1,
              'is_cloned': dependency.is_cloned || false
            });
          }
        }
      }
    }
  },
  findNodeIndex: function (id) {
    var self = this;
    for (var i = 0; i < self.nodes.length; i++) {
      if (self.nodes[i].id=== id){ return i; }
    }
  },
  nodeImageUrl: function (d) {
    var color = d.is_cloned || false ? "gray" : "green";
    var nodeType = d.type.toLowerCase().split('::').reverse()[0];
    return WEBROOT + "static/conveyordashboard/img/" + nodeType + '-' + color + ".svg";
  },
  nodeInfo: function (d) {
    return '<img src="' + this.nodeImageUrl(d) + '" width="35px" height="35px" />' +
      '<p>' + gettext('Name') + ': ' + d.name_in_template + '</p>' +
      '<p>' + gettext('Type') + ': ' + d.type + '</p>' +
      '<p>' + gettext('Id') + ': ' + d.id + '</p>'
  },
  update: function () {
    var self = this;
    self.node = self.node.data(self.nodes, function(d) { return d.id; });
    self.link = self.link.data(self.links);

    var nodeEnter = self.node.enter().append("g")
      .attr('class', 'node')
      .attr('node_name', function(d) { return d.name; })
      .attr('node_id', function(d) { return d.id; })
      .attr('node_type', function(d) { return d.type; })
      .attr('cloned', function (d) { return d.is_cloned})
      .call(self.force.drag);

    nodeEnter.append('image')
      .attr("xlink:href", function(d) { return self.nodeImageUrl(d); })
      .attr("id", function(d){ return "image_"+ d.id; })
      .attr("x", function(d) { return -25; })
      .attr("y", function(d) { return -25; })
      .attr("width", function(d) { return 50; })
      .attr("height", function(d) { return 50; })
      .attr("clip-path","url(#clipCircle)");
    self.node.exit().remove();

    self.link.enter().insert("path", "g.node")
      .attr("class", function(d) { return "link " + (d.is_cloned ? 'cloned' : 'not_clone') });

    self.link.exit().remove();

    //Setup click action for all nodes
    self.node.on("mouseover", function(d) {
      $(self.info_box).html(self.nodeInfo(d));
    });
    self.node.on("mouseout", function(d) {
      $(self.info_box).html('');
    });

    self.force.start();
  },
  updateTopo: function (json){
    if (json.length === 0) {
      return;
    }
    var self = this;
    self.needs_update = false;

    //Check Remove nodes
    // remove_nodes(nodes, json.nodes);
    self.removeNodes(self.nodes, {});

    //Check for updates and new nodes

    var nID=[];
    $(self.thumbnail_container).find('circle').each(function(i, e){
      $(this).css("fill","black");
      var id = $(this).attr("id");
      nID.push(id);
    });

    json.forEach(function(d){
      if(nID.toString().indexOf(d.id) > -1){
        $(self.thumbnail_container).find('circle').each(function(i, e){
          if($(this).attr("id") == d.id){
            $(this).css("fill","red");
          }
        });
      }

      var current_node = self.findNode(d.id);
      //Check if node already exists
      if (current_node) {
        //Node already exists, just update it
        current_node.status = d.status;

        //Status has changed, image should be updated
        if (current_node.image !== d.image){
          current_node.image = d.image;
          var this_image = d3.select("#image_" + current_node.id);
          this_image
            .transition()
            .attr("x", function(d) { return d.image_x + 5; })
            .duration(100)
            .transition()
            .attr("x", function(d) { return d.image_x - 5; })
            .duration(100)
            .transition()
            .attr("x", function(d) { return d.image_x + 5; })
            .duration(100)
            .transition()
            .attr("x", function(d) { return d.image_x - 5; })
            .duration(100)
            .transition()
            .attr("xlink:href", d.image)
            .transition()
            .attr("x", function(d) { return d.image_x; })
            .duration(100)
            .ease("bounce");
        }

        //Status has changed, update info_box
        current_node.info_box = d.info_box;

      } else {
        self.addNode(d);
        self.buildLinks();
      }
    });
    //if any updates needed, do update now
    if (self.needs_update === true){
      self.update();
    }
  },

  removeNodes: function (old_nodes, new_nodes){
    var self = this;
    var needed_remove_ids = [];
    //Check for removed nodes
    for (var i = 0; i < old_nodes.length; i++) {
      var remove_node = true;
      for (var j = 0; j < new_nodes.length; j++) {
        if (old_nodes[i].id === new_nodes[j].id){
          remove_node = false;
          break;
        }
      }
      if (remove_node === true){
        needed_remove_ids.push(old_nodes[i].id);
        //removeNode(old_nodes[i].id);
      }
    }
    for(var index in needed_remove_ids){
      self.removeNode(needed_remove_ids[index]);
    }
  },
  removeNode: function (id) {
    var self = this;
    var i = 0;
    var n = self.findNode(id);
    while (i < self.links.length) {
      if (self.links[i].source === n || self.links[i].target === n) {
        self.links.splice(i, 1);
      } else {
        i++;
      }
    }
    self.nodes.splice(self.findNodeIndex(id),1);
    self.needs_update = true;
  },
  findNode: function (id) {
    var self = this;
    var nodes = self.nodes;
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id){ return nodes[i]; }
    }
  },
  addNode: function (node) {
    var self = this;
    self.nodes.push(node);
    self.needs_update = true;
    for(var idx = 0; idx < self.nodes.length; idx++){
    }
  }
};
