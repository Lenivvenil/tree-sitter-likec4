/// <reference types="tree-sitter-cli/dsl" />

const PREC = {
  RELATION: 10,
  DOT: 15,
};

module.exports = grammar({
  name: "likec4",

  extras: ($) => [/[\s\n\r\t]/, $.comment],

  word: ($) => $.identifier,

  conflicts: ($) => [
    [$.include_statement],
    [$.exclude_statement],
    [$.dynamic_step],
  ],

  rules: {
    source_file: ($) => repeat($._top_level),

    _top_level: ($) =>
      choice(
        $.specification_block,
        $.model_block,
        $.views_block,
        $.deployment_block,
        $.global_block,
        $.likec4lib_block,
        $.import_statement,
      ),

    // ── Top-level blocks ──────────────────────────────────────────────

    specification_block: ($) =>
      seq("specification", "{", repeat($._specification_item), "}"),

    model_block: ($) => seq("model", "{", repeat($._model_item), "}"),

    views_block: ($) =>
      seq("views", optional($.string), "{", repeat($._views_item), "}"),

    deployment_block: ($) =>
      seq("deployment", "{", repeat($._deployment_item), "}"),

    global_block: ($) => seq("global", "{", repeat($._global_item), "}"),

    likec4lib_block: ($) =>
      seq("likec4lib", "{", repeat($._likec4lib_item), "}"),

    import_statement: ($) =>
      seq(
        "import",
        "{",
        commaSep1($.identifier),
        "}",
        "from",
        $.string,
      ),

    // ── Specification items ───────────────────────────────────────────

    _specification_item: ($) =>
      choice(
        $.element_kind_declaration,
        $.tag_declaration,
        $.relationship_kind_declaration,
        $.color_declaration,
        $.deployment_node_kind_declaration,
      ),

    element_kind_declaration: ($) =>
      seq(
        "element",
        field("name", $.identifier),
        optional(seq("{", repeat($._element_kind_body_item), "}")),
      ),

    tag_declaration: ($) =>
      seq(
        "tag",
        field("name", $.identifier),
        optional(seq("{", repeat($._style_property), "}")),
      ),

    relationship_kind_declaration: ($) =>
      seq(
        "relationship",
        field("name", $.identifier),
        optional(seq("{", repeat($._style_property), "}")),
      ),

    color_declaration: ($) =>
      seq("color", field("name", $.identifier), $._color_value),

    deployment_node_kind_declaration: ($) =>
      seq(
        "deploymentNode",
        field("name", $.identifier),
        optional(seq("{", repeat($._element_kind_body_item), "}")),
      ),

    _element_kind_body_item: ($) =>
      choice($._string_property, $.style_block, $._semicolon),

    // ── Model items ──────────────────────────────────────────────────

    _model_item: ($) =>
      choice(
        $.element_declaration,
        $.relation,
        $.extend_element,
        $.extend_relation,
        $._semicolon,
      ),

    element_declaration: ($) =>
      prec.right(choice(
        // kind-first: component backend 'Title' { ... }
        seq(
          field("kind", $.identifier),
          field("name", $.identifier),
          repeat($.string),
          optional($.tags),
          optional($.element_body),
        ),
        // assignment: backend = component 'Title' { ... }
        seq(
          field("name", $.identifier),
          "=",
          field("kind", $.identifier),
          repeat($.string),
          optional($.tags),
          optional($.element_body),
        ),
      )),

    element_body: ($) => seq("{", repeat($._element_body_item), "}"),

    _element_body_item: ($) =>
      choice(
        $.element_declaration,
        $.relation,
        $._string_property,
        $.link_property,
        $.icon_property,
        $.style_block,
        $.metadata_block,
        $.tags,
        $._semicolon,
      ),

    extend_element: ($) =>
      seq("extend", $.fqn_ref, "{", repeat($._element_body_item), "}"),

    extend_relation: ($) =>
      seq(
        "extend",
        $.fqn_ref,
        $._arrow,
        $.fqn_ref,
        repeat($.string),
        optional(seq("{", repeat($._relation_body_item), "}")),
      ),

    // ── Relations ────────────────────────────────────────────────────

    relation: ($) =>
      prec.right(
        PREC.RELATION,
        seq(
          optional(field("source", $._relation_target)),
          $._arrow,
          field("target", $._relation_target),
          repeat($.string),
          optional($.tags),
          optional(seq("{", repeat($._relation_body_item), "}")),
        ),
      ),

    _relation_target: ($) =>
      choice($.fqn_ref, "this", "it"),

    _arrow: ($) =>
      choice(
        $.arrow_directed,
        $.arrow_backward,
        $.arrow_bidirectional,
        $.arrow_typed,
        $.dot_relation,
      ),

    arrow_directed: (_) => "->",
    arrow_backward: (_) => "<-",
    arrow_bidirectional: (_) => "<->",
    arrow_typed: ($) =>
      seq("-[", field("kind", $.identifier), "]->"),
    dot_relation: ($) =>
      seq(".", field("kind", $.identifier)),

    _relation_body_item: ($) =>
      choice(
        $._string_property,
        $.link_property,
        $.navigate_to,
        $.style_block,
        $.metadata_block,
        $.tags,
        $._semicolon,
      ),

    // ── Views items ──────────────────────────────────────────────────

    _views_item: ($) =>
      choice($.view_declaration, $.dynamic_view_declaration),

    view_declaration: ($) =>
      seq(
        optional("deployment"),
        "view",
        optional(field("name", $.identifier)),
        optional(seq("of", $.fqn_ref)),
        optional(seq("extends", field("extends", $.identifier))),
        "{",
        repeat($._view_body_item),
        "}",
      ),

    dynamic_view_declaration: ($) =>
      seq(
        "dynamic",
        "view",
        optional(field("name", $.identifier)),
        optional(seq("of", $.fqn_ref)),
        optional(seq("extends", field("extends", $.identifier))),
        "{",
        repeat($._dynamic_view_body_item),
        "}",
      ),

    _view_body_item: ($) =>
      choice(
        $._string_property,
        $.link_property,
        $.tags,
        $.include_statement,
        $.exclude_statement,
        $.auto_layout,
        $.view_style_rule,
        $.view_group,
        $.view_rank,
        $.global_ref,
        $._semicolon,
      ),

    _dynamic_view_body_item: ($) =>
      choice(
        $._string_property,
        $.link_property,
        $.tags,
        $.dynamic_step,
        $.parallel_block,
        $.include_statement,
        $.exclude_statement,
        $.auto_layout,
        $.view_style_rule,
        $.view_group,
        $.global_ref,
        $.variant_property,
        $._semicolon,
      ),

    // ── View expressions ─────────────────────────────────────────────

    include_statement: ($) =>
      seq("include", commaSep1($._view_predicate)),

    exclude_statement: ($) =>
      seq("exclude", commaSep1($._view_predicate)),

    _view_predicate: ($) =>
      seq(
        $._view_expression,
        optional($.where_clause),
        optional($.with_clause),
      ),

    _view_expression: ($) =>
      choice(
        $.wildcard,
        $.element_ref,
        $.relation_expression,
        $.element_filter,
      ),

    wildcard: (_) => "*",

    element_ref: ($) =>
      choice($.fqn_ref, $.descendant_ref),

    descendant_ref: ($) =>
      seq($.fqn_ref, choice(".*", ".**", "._")),

    relation_expression: ($) =>
      prec.right(
        PREC.RELATION,
        choice(
          // -> target
          seq("->", $._view_expression),
          // source -> target
          seq($._view_expression, "->", $._view_expression),
          // source ->
          seq($._view_expression, "->"),
          // bidirectional
          seq($._view_expression, "<->", $._view_expression),
        ),
      ),

    element_filter: ($) =>
      seq(
        choice("element.kind", "element.tag"),
        choice("=", "==", "!=", "!=="),
        choice($.identifier, $.tag_ref),
      ),

    where_clause: ($) => seq("where", $._where_expression),

    _where_expression: ($) =>
      choice(
        $.where_condition,
        $.where_not,
        $.where_and,
        $.where_or,
        seq("(", $._where_expression, ")"),
      ),

    where_condition: ($) =>
      seq(
        choice("tag", "kind", "source.tag", "source.kind", "target.tag", "target.kind"),
        choice("is", seq("is", "not"), "=", "==", "!=", "!=="),
        choice($.identifier, $.tag_ref),
      ),

    where_not: ($) => prec(3, seq("not", $._where_expression)),
    where_and: ($) => prec.left(2, seq($._where_expression, "and", $._where_expression)),
    where_or: ($) => prec.left(1, seq($._where_expression, "or", $._where_expression)),

    with_clause: ($) =>
      seq("with", "{", repeat($._style_property), "}"),

    auto_layout: ($) =>
      seq(
        "autoLayout",
        choice("TopBottom", "LeftRight", "BottomTop", "RightLeft"),
        optional($.number),
        optional($.number),
      ),

    view_style_rule: ($) =>
      seq(
        "style",
        commaSep1(choice($.wildcard, $.fqn_ref, $.descendant_ref, $.element_filter)),
        "{",
        repeat($._style_property),
        "}",
      ),

    view_group: ($) =>
      seq(
        "group",
        optional($.string),
        "{",
        repeat($._view_body_item),
        "}",
      ),

    view_rank: ($) =>
      seq(
        "rank",
        choice("same", "min", "max", "source", "sink"),
        "{",
        commaSep1($.fqn_ref),
        "}",
      ),

    global_ref: ($) =>
      seq("global", choice("predicate", "style"), $.identifier),

    dynamic_step: ($) =>
      prec(
        PREC.RELATION,
        seq(
          $.fqn_ref,
          choice("->", "<-"),
          $.fqn_ref,
          repeat($.string),
          optional($.tags),
          optional(seq("{", repeat($._relation_body_item), "}")),
        ),
      ),

    parallel_block: ($) =>
      seq(
        choice("parallel", "par"),
        "{",
        repeat($.dynamic_step),
        "}",
      ),

    variant_property: ($) => seq("variant", $.string),

    // ── Deployment items ─────────────────────────────────────────────

    _deployment_item: ($) =>
      choice(
        $.deployment_node,
        $.deployment_relation,
        $._semicolon,
      ),

    deployment_node: ($) =>
      prec.right(choice(
        seq(
          field("kind", $.identifier),
          field("name", $.identifier),
          repeat($.string),
          optional($.tags),
          optional(seq("{", repeat($._deployment_node_body_item), "}")),
        ),
        seq(
          field("name", $.identifier),
          "=",
          field("kind", $.identifier),
          repeat($.string),
          optional($.tags),
          optional(seq("{", repeat($._deployment_node_body_item), "}")),
        ),
      )),

    _deployment_node_body_item: ($) =>
      choice(
        $.deployment_node,
        $.instance_of,
        $.deployment_relation,
        $._string_property,
        $.link_property,
        $.icon_property,
        $.style_block,
        $.metadata_block,
        $.tags,
        $._semicolon,
      ),

    instance_of: ($) =>
      choice(
        seq("instanceOf", $.fqn_ref),
        seq(field("name", $.identifier), "=", "instanceOf", $.fqn_ref),
      ),

    deployment_relation: ($) =>
      prec.right(
        PREC.RELATION,
        seq(
          optional(field("source", $.fqn_ref)),
          "->",
          field("target", $.fqn_ref),
          repeat($.string),
          optional($.tags),
          optional(seq("{", repeat($._relation_body_item), "}")),
        ),
      ),

    // ── Global items ─────────────────────────────────────────────────

    _global_item: ($) =>
      choice(
        $.predicate_group,
        $.dynamic_predicate_group,
        $.global_style,
        $.global_style_group,
      ),

    predicate_group: ($) =>
      seq(
        "predicateGroup",
        field("name", $.identifier),
        "{",
        repeat(choice($.include_statement, $.exclude_statement)),
        "}",
      ),

    dynamic_predicate_group: ($) =>
      seq(
        "dynamicPredicateGroup",
        field("name", $.identifier),
        "{",
        repeat(choice($.include_statement, $.exclude_statement)),
        "}",
      ),

    global_style: ($) =>
      seq(
        "style",
        field("name", $.identifier),
        commaSep1(choice($.wildcard, $.fqn_ref, $.descendant_ref, $.element_filter)),
        "{",
        repeat($._style_property),
        "}",
      ),

    global_style_group: ($) =>
      seq(
        "styleGroup",
        field("name", $.identifier),
        "{",
        repeat($.view_style_rule),
        "}",
      ),

    // ── likec4lib ────────────────────────────────────────────────────

    _likec4lib_item: ($) =>
      seq("icons", "{", repeat($.lib_icon), "}"),

    // ── Common constructs ────────────────────────────────────────────

    style_block: ($) => seq("style", "{", repeat($._style_property), "}"),

    _style_property: ($) =>
      prec.right(seq(
        field(
          "key",
          choice(
            "color",
            "shape",
            "border",
            "opacity",
            "icon",
            "iconColor",
            "iconSize",
            "iconPosition",
            "multiple",
            "size",
            "padding",
            "textSize",
            "line",
            "head",
            "tail",
            "title",
            "description",
            "technology",
            "notation",
            "notes",
            "summary",
          ),
        ),
        optional(":"),
        $._property_value,
        optional(";"),
      )),

    _string_property: ($) =>
      prec.right(
        seq(
          field(
            "key",
            choice("title", "description", "technology", "notation", "notes", "summary"),
          ),
          optional(":"),
          $.string,
          optional(";"),
        ),
      ),

    link_property: ($) =>
      seq("link", $._uri, optional($.string)),

    icon_property: ($) =>
      seq("icon", choice($._uri, $.lib_icon, "none")),

    navigate_to: ($) => seq("navigateTo", $.identifier),

    metadata_block: ($) =>
      seq("metadata", "{", repeat($.metadata_entry), "}"),

    metadata_entry: ($) =>
      prec.right(seq(
        field("key", $.identifier),
        optional(":"),
        choice($.string, $.metadata_array),
        optional(";"),
      )),

    metadata_array: ($) =>
      seq("[", commaSep1($.string), "]"),

    _property_value: ($) =>
      choice(
        $.string,
        $.identifier,
        $.number,
        $.percentage,
        $.boolean,
        $._color_value,
        $._uri,
        $.lib_icon,
        "none",
      ),

    tags: ($) => prec.left(repeat1($.tag_ref)),

    tag_ref: ($) => seq("#", $.identifier),

    fqn_ref: ($) =>
      prec.left(
        PREC.DOT,
        seq($.identifier, repeat(seq(".", $.identifier))),
      ),

    _uri: ($) => choice($.uri_with_schema, $.uri_relative, $.uri_alias),

    _color_value: ($) => choice($.hex_color, $.rgb_color, $.rgba_color),

    hex_color: ($) => seq("#", $.hex_digits),

    rgb_color: ($) =>
      seq("rgb", "(", $.number, optional(","), $.number, optional(","), $.number, ")"),

    rgba_color: ($) =>
      seq(
        "rgba",
        "(",
        $.number,
        optional(","),
        $.number,
        optional(","),
        $.number,
        optional(","),
        choice($.number, $.float, $.percentage),
        ")",
      ),

    _semicolon: (_) => ";",

    // ── Terminals ────────────────────────────────────────────────────

    comment: (_) =>
      token(
        choice(
          seq("//", /[^\r\n]*/),
          seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/"),
        ),
      ),

    string: (_) =>
      token(
        choice(
          seq("'", repeat(choice(/[^'\\]/, /\\./)), "'"),
          seq('"', repeat(choice(/[^"\\]/, /\\./)), '"'),
          seq("'''", /[\s\S]*?/, "'''"),
          seq('"""', /[\s\S]*?/, '"""'),
        ),
      ),

    identifier: (_) => /[_]*[a-zA-Z][-\w]*/,

    number: (_) => /\d+/,

    float: (_) => /\d+\.\d+/,

    percentage: (_) => /\d+%/,

    boolean: (_) => choice("true", "false"),

    hex_digits: (_) => /[a-fA-F0-9]{3,8}/,

    lib_icon: (_) => /(?:aws|azure|bootstrap|gcp|tech):[-\w]+/,

    uri_with_schema: (_) => /\w+:\/\/\S+/,

    uri_relative: (_) => /\.{0,2}\/[^\/]\S*/,

    uri_alias: (_) => /@[a-zA-Z0-9_-]*\/\S+/,
  },
});

function commaSep1(rule) {
  return seq(rule, repeat(seq(",", rule)), optional(","));
}
